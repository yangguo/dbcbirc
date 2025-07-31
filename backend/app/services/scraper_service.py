import aiohttp
import asyncio
from bs4 import BeautifulSoup
import pandas as pd
import requests
import json
import random
import time
import os
import glob
import hashlib
import traceback
import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from app.core.database import db_manager
from app.models.case import OrganizationType, CaseDetail, CaseSummary


class ScraperService:
    def __init__(self):
        # Updated to use the correct NFRA base URL
        self.base_url = "https://www.nfra.gov.cn"
        self.detail_base_url = "https://www.nfra.gov.cn/cn/static/data/DocInfo/SelectByDocId/data_docId"
        self.summary_base_url = "https://www.nfra.gov.cn/cbircweb/DocInfo/SelectDocByItemIdAndChild"
        
        # Organization type mapping for API requests
        self.org_id_mapping = {
            OrganizationType.HEADQUARTERS: "4113",  # 银保监会机关
            OrganizationType.PROVINCIAL: "4114",   # 银保监局本级
            OrganizationType.LOCAL: "4115"         # 银保监分局本级
        }
        
        # Organization name mapping for file operations
        self.org_name_mapping = {
            OrganizationType.HEADQUARTERS: "jiguan",
            OrganizationType.PROVINCIAL: "benji", 
            OrganizationType.LOCAL: "fenju"
        }
        
        # Reverse mapping for string to enum conversion
        self.string_to_org = {
            "jiguan": OrganizationType.HEADQUARTERS,
            "benji": OrganizationType.PROVINCIAL,
            "fenju": OrganizationType.LOCAL
        }
        
        # Data storage directory - ensure it points to the correct cbirc folder
        # Go up from backend/app/services/scraper_service.py to project root, then into cbirc
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        self.data_dir = os.path.join(project_root, "cbirc")
        os.makedirs(self.data_dir, exist_ok=True)
        print(f"Data directory set to: {self.data_dir}")
    
    def _get_timestamp(self) -> str:
        """Get current timestamp string for file naming"""
        return datetime.now().strftime("%Y%m%d%H%M%S")
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """Parse date string to date object"""
        if not date_str:
            return None
        try:
            # Try different date formats
            for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"]:
                try:
                    return datetime.strptime(date_str.strip(), fmt).date()
                except ValueError:
                    continue
            return None
        except Exception:
            return None
    
    def _generate_case_id(self, title: str, subtitle: str, publish_date: str) -> str:
        """Generate unique case ID from case data"""
        content = f"{title}_{subtitle}_{publish_date}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()[:16]
    
    def _clean_doc_content(self, raw_content: str) -> str:
        """Clean docClob content - simple approach like dbcbirc.py"""
        if not raw_content:
            return ""
        
        content_str = str(raw_content).strip()
        
        # Only clean if content contains HTML/XML tags
        if '<' in content_str and '>' in content_str:
            try:
                print(f"DEBUG: Cleaning HTML content, original length: {len(content_str)}")
                soup = BeautifulSoup(content_str, "html.parser")
                cleaned_content = soup.get_text().strip()
                
                # Basic whitespace cleanup
                cleaned_content = re.sub(r'\s+', ' ', cleaned_content)
                
                print(f"DEBUG: Cleaned content length: {len(cleaned_content)}")
                print(f"DEBUG: Cleaned content preview: {cleaned_content[:100]}...")
                
                # Return cleaned content if it's meaningful, otherwise return original
                if cleaned_content and len(cleaned_content) > 10:
                    return cleaned_content
                else:
                    print("DEBUG: Cleaned content too short, returning original")
                    return content_str
                    
            except Exception as e:
                print(f"Error cleaning HTML content: {e}")
        else:
            print(f"DEBUG: No HTML tags found in content, length: {len(content_str)}")
        
        # Return original content if no HTML tags or cleaning failed
        return content_str
    
    def _deduplicate_cases(self, cases: List[Dict[str, Any]], existing_ids: set = None) -> List[Dict[str, Any]]:
        """去重案例数据，同时检查数据库和文件中的重复"""
        if not cases:
            return []
        
        if existing_ids is None:
            existing_ids = set()
        
        # 创建DataFrame用于去重
        df = pd.DataFrame(cases)
        
        # 确保所有案例都有ID
        for i, case in enumerate(cases):
            if not case.get('id'):
                case_id = self._generate_case_id(
                    case.get('title', ''),
                    case.get('subtitle', ''),
                    case.get('publish_date', '')
                )
                case['id'] = case_id
                df.loc[i, 'id'] = case_id
            else:
                # 确保ID是字符串格式
                case['id'] = str(case['id'])
                df.loc[i, 'id'] = str(case['id'])
        
        # 1. 首先去除内部重复（按ID去重）
        df_deduped = df.drop_duplicates(subset=['id'], keep='first')
        print(f"内部去重: {len(df)} -> {len(df_deduped)} 条记录")
        
        # 2. 然后去除与已有数据的重复
        if existing_ids:
            df_new = df_deduped[~df_deduped['id'].isin(existing_ids)]
            print(f"与已有数据去重: {len(df_deduped)} -> {len(df_new)} 条记录")
        else:
            df_new = df_deduped
        
        # 3. 进一步按内容去重（标题+文号+日期）
        content_columns = ['title', 'subtitle', 'publish_date']
        available_columns = [col for col in content_columns if col in df_new.columns]
        
        if available_columns:
            initial_count = len(df_new)
            df_final = df_new.drop_duplicates(subset=available_columns, keep='first')
            print(f"按内容去重: {initial_count} -> {len(df_final)} 条记录")
        else:
            df_final = df_new
        
        # 重置索引并转换回字典列表
        df_final = df_final.reset_index(drop=True)
        return df_final.to_dict('records')
    
    def _get_existing_cases_from_files(self, org_name: OrganizationType) -> set:
        """从文件中获取已有案例ID，用于去重"""
        try:
            org_name_str = self.org_name_mapping[org_name]
            existing_ids = set()
            
            # 检查汇总文件
            summary_pattern = f"cbircsum{org_name_str}*.csv"
            summary_files = glob.glob(os.path.join(self.data_dir, summary_pattern))
            
            for file_path in summary_files:
                try:
                    df = pd.read_csv(file_path)
                    if 'docId' in df.columns:
                        existing_ids.update(df['docId'].astype(str).tolist())
                    elif 'id' in df.columns:
                        existing_ids.update(df['id'].astype(str).tolist())
                except Exception as e:
                    print(f"读取文件 {file_path} 失败: {e}")
            
            # 检查详情文件
            detail_pattern = f"cbircdtl{org_name_str}*.csv"
            detail_files = glob.glob(os.path.join(self.data_dir, detail_pattern))
            
            for file_path in detail_files:
                try:
                    df = pd.read_csv(file_path)
                    if 'id' in df.columns:
                        existing_ids.update(df['id'].astype(str).tolist())
                except Exception as e:
                    print(f"读取文件 {file_path} 失败: {e}")
            
            print(f"从文件中找到 {len(existing_ids)} 个已有案例ID")
            return existing_ids
            
        except Exception as e:
            print(f"从文件获取已有案例ID时出错: {e}")
            return set()
    
    async def _save_to_database(self, cases: List[Dict[str, Any]], org_name: OrganizationType) -> int:
        """Save cases to MongoDB database"""
        try:
            if not cases:
                return 0
            
            # Check if database connection is enabled
            if not db_manager._connection_enabled:
                print("Database connection is disabled - skipping database save")
                return 0
            
            # Check if database is connected
            if not db_manager.client:
                print("Database not connected - skipping database save")
                return 0
            
            # Convert to CaseDetail objects
            case_details = []
            for case_data in cases:
                try:
                    # Ensure we have an ID and convert to string
                    case_id = case_data.get('id')
                    if not case_id:
                        case_id = self._generate_case_id(
                            case_data.get('title', ''),
                            case_data.get('subtitle', ''),
                            case_data.get('publish_date', '')
                        )
                    else:
                        # Convert ID to string if it's not already
                        case_id = str(case_id)
                    
                    # Parse the publish date
                    publish_date = self._parse_date(case_data.get('publish_date', ''))
                    if not publish_date:
                        publish_date = date.today()
                    
                    case_detail = CaseDetail(
                        id=case_id,
                        title=case_data.get('title', ''),
                        subtitle=case_data.get('subtitle', ''),
                        publish_date=publish_date,
                        content=self._clean_doc_content(case_data.get('content', case_data.get('docClob', ''))),
                        org=self.org_name_mapping[org_name]
                    )
                    case_details.append(case_detail.dict())
                except Exception as e:
                    print(f"Error processing case data: {e}")
                    print(f"Case data that failed: {case_data}")
                    continue
            
            if not case_details:
                return 0
            
            # Save to database
            collection_name = f"cases_{self.org_name_mapping[org_name]}"
            collection = db_manager.get_collection(collection_name)
            
            # Use upsert to avoid duplicates
            new_cases = 0
            for case in case_details:
                result = await collection.replace_one(
                    {"id": case["id"]}, 
                    case, 
                    upsert=True
                )
                if result.upserted_id:
                    new_cases += 1
            
            print(f"Saved {new_cases} new cases to database collection {collection_name}")
            return new_cases
            
        except Exception as e:
            print(f"Error saving to database: {e}")
            print("Continuing without database save...")
            return 0
    
    def _save_to_csv(self, df: pd.DataFrame, filename: str) -> str:
        """Save DataFrame to CSV file"""
        try:
            filepath = os.path.join(self.data_dir, f"{filename}.csv")
            df.to_csv(filepath, index=False, encoding='utf-8-sig')
            print(f"Saved data to: {filepath}")
            return filepath
        except Exception as e:
            print(f"Error saving CSV: {e}")
            return ""
    
    async def _get_existing_cases(self, org_name: OrganizationType) -> set:
        """Get set of existing case IDs from database"""
        try:
            # Check if database connection is enabled
            if not db_manager._connection_enabled:
                print("Database connection is disabled - returning empty set")
                return set()
            
            # Check if database is connected
            if not db_manager.client:
                print("Database not connected - returning empty set")
                return set()
            
            collection_name = f"cases_{self.org_name_mapping[org_name]}"
            collection = db_manager.get_collection(collection_name)
            
            cursor = collection.find({}, {"id": 1})
            existing_ids = set()
            async for doc in cursor:
                existing_ids.add(doc["id"])
            
            print(f"Found {len(existing_ids)} existing cases in database")
            return existing_ids
            
        except Exception as e:
            print(f"Error getting existing cases: {e}")
            print("Continuing with empty set...")
            return set()
    
    async def _fetch_summary_page(self, session: aiohttp.ClientSession, org_id: str, page_num: int) -> List[Dict[str, Any]]:
        """Fetch a single page of case summaries"""
        url = f"{self.summary_base_url}?itemId={org_id}&pageSize=18&pageIndex={page_num}"
        
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}: {response.reason}")
                
                text = await response.text()
                if not text.strip():
                    raise Exception("Empty response")
                
                json_data = json.loads(text)
                
                if "data" in json_data and "rows" in json_data["data"]:
                    rows = json_data["data"]["rows"]
                    if rows and isinstance(rows, list):
                        # Process each row to standardize the data
                        processed_rows = []
                        for row in rows:
                            # Ensure ID is converted to string
                            doc_id = row.get('docId', '')
                            if doc_id:
                                doc_id = str(doc_id)
                            
                            processed_row = {
                                'id': doc_id,
                                'title': row.get('docTitle', ''),
                                'subtitle': row.get('docSubtitle', ''),
                                'publish_date': row.get('publishDate', ''),
                                'content': self._clean_doc_content(row.get('docClob', '')),
                                # Keep original data for reference, but exclude docClob to avoid overriding cleaned content
                                **{k: v for k, v in row.items() if k != 'docClob'}
                            }
                            processed_rows.append(processed_row)
                        return processed_rows
                
                return []
                
        except Exception as e:
            print(f"Error fetching page {page_num}: {e}")
            raise
    
    async def _fetch_case_detail(self, session: aiohttp.ClientSession, case_id: str) -> Dict[str, Any]:
        """Fetch detailed information for a single case"""
        url = f"{self.detail_base_url}={case_id}.json"
        
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}")
                
                text = await response.text()
                if not text.strip() or text.strip().startswith('<'):
                    raise Exception("Invalid response")
                
                json_data = json.loads(text)
                
                if "data" in json_data and isinstance(json_data["data"], dict):
                    data_obj = json_data["data"]
                    # Use helper method to clean docClob content
                    raw_content = data_obj.get("docClob", "")
                    cleaned_content = self._clean_doc_content(raw_content)
                    
                    return {
                        "id": case_id,
                        "title": data_obj.get("docTitle", ""),
                        "subtitle": data_obj.get("docSubtitle", ""),
                        "content": cleaned_content,
                        "publish_date": data_obj.get("publishDate", ""),
                        # Include all original fields except docClob to avoid overriding cleaned content
                        **{k: v for k, v in data_obj.items() if k != 'docClob'}
                    }
                
                raise Exception("Invalid JSON structure")
                
        except Exception as e:
            print(f"Error fetching detail for case {case_id}: {e}")
            raise
        
    async def scrape_cases(self, org_name: OrganizationType, start_page: int, end_page: int):
        """Scrape cases from NFRA website - completely self-contained implementation"""
        try:
            print(f"=== SCRAPE_CASES START ===")
            print(f"Organization: {org_name}")
            print(f"Page range: {start_page} to {end_page}")
            
            org_id = self.org_id_mapping[org_name]
            org_name_str = self.org_name_mapping[org_name]
            
            print(f"Organization ID: {org_id}")
            print(f"Organization string: {org_name_str}")
            
            # Get existing cases from both database and files to avoid duplicates
            database_existing_cases = await self._get_existing_cases(org_name)
            file_existing_cases = self._get_existing_cases_from_files(org_name)
            all_existing_cases = database_existing_cases.union(file_existing_cases)
            print(f"Total existing cases: {len(all_existing_cases)} (DB: {len(database_existing_cases)}, Files: {len(file_existing_cases)})")
            
            all_cases = []
            errors = []
            
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
                connector=aiohttp.TCPConnector(ssl=False)
            ) as session:
                
                # Fetch summary pages
                for page_num in range(start_page, end_page + 1):
                    print(f"\n--- Processing summary page {page_num} ---")
                    
                    try:
                        cases_on_page = await self._fetch_summary_page(session, org_id, page_num)
                        print(f"Found {len(cases_on_page)} cases on page {page_num}")
                        
                        if cases_on_page:
                            all_cases.extend(cases_on_page)
                            
                        # Rate limiting
                        delay = random.uniform(1, 3)
                        print(f"Waiting {delay:.2f} seconds...")
                        await asyncio.sleep(delay)
                        
                    except Exception as e:
                        error_msg = f"Page {page_num}: {str(e)}"
                        print(f"ERROR: {error_msg}")
                        errors.append(error_msg)
            
            print(f"\n--- Summary Phase Complete ---")
            print(f"Total cases scraped: {len(all_cases)}")
            print(f"Errors: {len(errors)}")
            
            if not all_cases:
                return {
                    "status": "completed",
                    "pages_processed": end_page - start_page + 1,
                    "total_scraped": 0,
                    "new_cases": 0,
                    "errors": len(errors),
                    "error_details": errors
                }
            
            # 执行去重处理，确保保存的数据是干净的
            print(f"\n--- Starting Deduplication ---")
            deduplicated_cases = self._deduplicate_cases(all_cases, all_existing_cases)
            print(f"After deduplication: {len(deduplicated_cases)} unique cases")
            
            # Save deduplicated summary data to CSV
            if deduplicated_cases:
                df_summary = pd.DataFrame(deduplicated_cases)
                summary_filename = f"cbircsum{org_name_str}_{self._get_timestamp()}"
                self._save_to_csv(df_summary, summary_filename)
            
            # Save to database - only new cases
            new_cases_saved = await self._save_to_database(deduplicated_cases, org_name)
            
            result = {
                "status": "completed",
                "pages_processed": end_page - start_page + 1,
                "total_scraped": len(all_cases),
                "new_cases": len(deduplicated_cases),
                "new_cases_saved_to_db": new_cases_saved,
                "errors": len(errors),
                "error_details": errors
            }
            
            print(f"Final result: {result}")
            print(f"=== SCRAPE_CASES END ===")
            return result
            
        except Exception as e:
            print(f"FATAL ERROR in scrape_cases: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def cleanup_temp_files(self, org_name: OrganizationType = None, max_age_hours: int = 24) -> Dict[str, Any]:
        """Clean up old temporary files"""
        try:
            if org_name:
                org_name_str = self.org_name_mapping[org_name]
                temp_pattern = f"temp_cbircdtl{org_name_str}*.csv"
            else:
                temp_pattern = "temp_cbircdtl*.csv"
            
            temp_files = glob.glob(os.path.join(self.data_dir, temp_pattern))
            
            cleaned_files = []
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for temp_file in temp_files:
                try:
                    file_age = current_time - os.path.getmtime(temp_file)
                    if file_age > max_age_seconds:
                        os.remove(temp_file)
                        cleaned_files.append(os.path.basename(temp_file))
                        print(f"Cleaned up old temporary file: {temp_file}")
                except Exception as e:
                    print(f"Error cleaning up temp file {temp_file}: {e}")
            
            return {
                "cleaned_files": cleaned_files,
                "total_cleaned": len(cleaned_files),
                "remaining_temp_files": len(temp_files) - len(cleaned_files)
            }
            
        except Exception as e:
            print(f"Error in cleanup_temp_files: {e}")
            return {
                "cleaned_files": [],
                "total_cleaned": 0,
                "remaining_temp_files": 0,
                "error": str(e)
            }

    def get_temp_progress(self, org_name: OrganizationType, task_timestamp: str = None) -> Dict[str, Any]:
        """Get progress from temporary files"""
        try:
            org_name_str = self.org_name_mapping[org_name]
            
            # Look for temporary files
            if task_timestamp:
                temp_pattern = f"temp_cbircdtl{org_name_str}_{task_timestamp}*.csv"
            else:
                temp_pattern = f"temp_cbircdtl{org_name_str}*.csv"
            
            temp_files = glob.glob(os.path.join(self.data_dir, temp_pattern))
            
            if not temp_files:
                return {
                    "has_temp_data": False,
                    "processed_cases": 0,
                    "temp_files": 0
                }
            
            # Get the most recent temp file
            temp_files.sort(key=os.path.getmtime, reverse=True)
            latest_temp_file = temp_files[0]
            
            try:
                temp_df = pd.read_csv(latest_temp_file)
                processed_cases = len(temp_df)
                
                return {
                    "has_temp_data": True,
                    "processed_cases": processed_cases,
                    "temp_files": len(temp_files),
                    "latest_temp_file": os.path.basename(latest_temp_file),
                    "last_modified": os.path.getmtime(latest_temp_file)
                }
            except Exception as e:
                print(f"Error reading temp file {latest_temp_file}: {e}")
                return {
                    "has_temp_data": False,
                    "processed_cases": 0,
                    "temp_files": len(temp_files),
                    "error": str(e)
                }
                
        except Exception as e:
            print(f"Error getting temp progress: {e}")
            return {
                "has_temp_data": False,
                "processed_cases": 0, 
                "temp_files": 0,
                "error": str(e)
            }

    async def update_case_details(self, org_name: OrganizationType):
        """Update case details from existing summary data - works with CSV files"""
        try:
            print(f"Starting case details update for {org_name}")
            
            org_name_str = self.org_name_mapping[org_name]
            
            # Get existing summary data from CSV files
            summary_pattern = f"cbircsum{org_name_str}*.csv"
            summary_files = glob.glob(os.path.join(self.data_dir, summary_pattern))
            
            if not summary_files:
                return {
                    "status": "error",
                    "message": f"No summary data found for {org_name}",
                    "updated_cases": 0
                }
            
            # Load all summary data
            summary_dfs = []
            for file_path in summary_files:
                try:
                    df = pd.read_csv(file_path)
                    summary_dfs.append(df)
                except Exception as e:
                    print(f"Error reading summary file {file_path}: {e}")
            
            if not summary_dfs:
                return {
                    "status": "error",
                    "message": f"Could not load summary data for {org_name}",
                    "updated_cases": 0
                }
            
            # Combine all summary data
            all_summary = pd.concat(summary_dfs, ignore_index=True)
            all_summary.drop_duplicates(subset=['docId'], inplace=True)
            
            # Get existing detail data to avoid duplicates
            detail_pattern = f"cbircdtl{org_name_str}*.csv"
            detail_files = glob.glob(os.path.join(self.data_dir, detail_pattern))
            
            # Also check for temporary files to resume if needed
            temp_pattern = f"temp_cbircdtl{org_name_str}*.csv"
            temp_files = glob.glob(os.path.join(self.data_dir, temp_pattern))
            
            existing_detail_ids = set()
            resumed_from_temp = False
            
            # Check temporary files first (most recent work)
            if temp_files:
                print(f"Found {len(temp_files)} temporary files, checking for resumable work...")
                for temp_file in temp_files:
                    try:
                        temp_df = pd.read_csv(temp_file)
                        if 'id' in temp_df.columns:
                            temp_ids = set(temp_df['id'].astype(str).tolist())
                            existing_detail_ids.update(temp_ids)
                            resumed_from_temp = True
                            print(f"Resumed {len(temp_ids)} case IDs from temporary file: {temp_file}")
                    except Exception as e:
                        print(f"Error reading temporary file {temp_file}: {e}")
            
            # Then check regular detail files
            for file_path in detail_files:
                try:
                    df = pd.read_csv(file_path)
                    if 'id' in df.columns:
                        existing_detail_ids.update(df['id'].astype(str).tolist())
                except Exception as e:
                    print(f"Error reading detail file {file_path}: {e}")
            
            if resumed_from_temp:
                print(f"Resuming from previous work - already have details for {len(existing_detail_ids)} cases")
            
            # Filter to only new cases that need details
            if 'docId' not in all_summary.columns:
                return {
                    "status": "error",
                    "message": f"Summary data missing 'docId' column for {org_name}",
                    "updated_cases": 0
                }
            
            # Convert docId to string for comparison
            all_summary['docId'] = all_summary['docId'].astype(str)
            cases_to_update = all_summary[~all_summary['docId'].isin(existing_detail_ids)]
            
            if cases_to_update.empty:
                return {
                    "status": "completed",
                    "message": f"All cases already have details for {org_name}",
                    "updated_cases": 0
                }
            
            print(f"Found {len(cases_to_update)} cases needing details")
            
            # Fetch details for new cases
            doc_ids = cases_to_update['docId'].tolist()
            detail_results = []
            error_count = 0
            
            # Create temporary file for saving progress
            timestamp = self._get_timestamp()
            temp_filename = f"temp_cbircdtl{org_name_str}_{timestamp}"
            temp_batch_size = 10  # Save every 10 records
            
            connector = aiohttp.TCPConnector(limit=10, limit_per_host=5, ssl=False)
            timeout = aiohttp.ClientTimeout(total=30, connect=10, sock_read=20)
            
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                for i, doc_id in enumerate(doc_ids):
                    try:
                        detail_url = f"{self.detail_base_url}={doc_id}.json"
                        print(f"Fetching detail {i+1}/{len(doc_ids)}: {doc_id} - URL: {detail_url}")
                        
                        detail_data = await self._fetch_case_detail(session, str(doc_id))
                        
                        if detail_data:
                            # Format detail data with English field names
                            raw_content = detail_data.get("docClob", "")
                            cleaned_content = self._clean_doc_content(raw_content)
                            formatted_detail = {
                                "title": detail_data.get("docTitle", ""),
                                "subtitle": detail_data.get("docSubtitle", ""),
                                "date": detail_data.get("publishDate", ""),
                                "doc": cleaned_content,
                                "id": str(doc_id)
                            }
                            detail_results.append(formatted_detail)
                            
                            # Save temporary results every batch_size records
                            if len(detail_results) % temp_batch_size == 0:
                                temp_df = pd.DataFrame(detail_results)
                                temp_filepath = self._save_to_csv(temp_df, temp_filename)
                                print(f"Saved {len(detail_results)} records to temporary file: {temp_filepath}")
                        
                        # Add delay between requests
                        if i < len(doc_ids) - 1:  # Don't delay after the last request
                            await asyncio.sleep(random.uniform(1, 3))
                            
                    except Exception as e:
                        print(f"Error fetching detail for {doc_id}: {e}")
                        error_count += 1
                        continue
            
            # Save results to CSV
            updated_cases = 0
            if detail_results:
                detail_df = pd.DataFrame(detail_results)
                
                # Save final timestamped file
                final_filename = f"cbircdtl{org_name_str}_{timestamp}"
                filepath = self._save_to_csv(detail_df, final_filename)
                
                if filepath:
                    updated_cases = len(detail_results)
                    print(f"Saved {updated_cases} new case details to final file: {filepath}")
                    
                    # Clean up temporary file if it exists
                    try:
                        temp_filepath = os.path.join(self.data_dir, f"{temp_filename}.csv")
                        if os.path.exists(temp_filepath):
                            os.remove(temp_filepath)
                            print(f"Cleaned up temporary file: {temp_filepath}")
                    except Exception as e:
                        print(f"Warning: Could not clean up temporary file: {e}")
                else:
                    print("Failed to save case details")
            else:
                # Clean up temporary file if no final results
                try:
                    temp_filepath = os.path.join(self.data_dir, f"{temp_filename}.csv")
                    if os.path.exists(temp_filepath):
                        os.remove(temp_filepath)
                        print(f"Cleaned up temporary file (no results): {temp_filepath}")
                except Exception as e:
                    print(f"Warning: Could not clean up temporary file: {e}")
            
            return {
                "status": "completed",
                "message": f"Updated {updated_cases} case details for {org_name}",
                "updated_cases": updated_cases,
                "error_count": error_count,
                "temp_saves": len(detail_results) // temp_batch_size if detail_results else 0
            }
            
        except Exception as e:
            print(f"Error in update_case_details: {e}")
            return {
                "status": "error",
                "message": f"Error updating case details: {str(e)}",
                "updated_cases": 0
            }
    
    async def get_case_detail(self, case_id: str) -> Dict[str, Any]:
        """Get detailed case information from NFRA website"""
        try:
            url = f"{self.detail_base_url}={case_id}.json"
            print(f"Fetching case detail from: {url}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, ssl=False) as response:
                    if response.status != 200:
                        raise aiohttp.ClientError(f"HTTP {response.status}: {response.reason}")
                    
                    text = await response.text()
                    
                    # Check for empty response
                    if not text.strip():
                        raise ValueError("Empty response from server")
                    
                    # Check for HTML error pages
                    if text.strip().startswith('<') or 'nginx' in text.lower() or '404' in text:
                        raise ValueError(f"Server returned HTML error page: {text[:100]}")
                    
                    try:
                        json_data = json.loads(text)
                    except json.JSONDecodeError as json_err:
                        raise ValueError(f"Invalid JSON response: {json_err}")

                    # Validate JSON structure
                    if not isinstance(json_data, dict) or "data" not in json_data:
                        raise ValueError("Invalid JSON structure: missing 'data' field")
                    
                    data_obj = json_data["data"]
                    if not isinstance(data_obj, dict):
                        raise ValueError("Invalid data structure in JSON response")
                        
                    # Clean content using helper method
                    raw_content = data_obj.get("docClob", "")
                    cleaned_content = self._clean_doc_content(raw_content)
                    
                    return {
                        "id": case_id,
                        "title": data_obj.get("docTitle", ""),
                        "subtitle": data_obj.get("docSubtitle", ""),
                        "content": cleaned_content,
                        "date": data_obj.get("publishDate", ""),
                        "publish_date": data_obj.get("publishDate", "")
                    }
            
        except Exception as e:
            print(f"Error getting case detail for {case_id}: {e}")
            raise
    
    async def fetch_case_details_batch(self, case_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch multiple case details with proper async handling"""
        try:
            print(f"Fetching details for {len(case_ids)} cases")
            
            results = []
            errors = []
            
            async with aiohttp.ClientSession() as session:
                for i, case_id in enumerate(case_ids):
                    try:
                        url = f"{self.detail_base_url}={case_id}.json"
                        
                        async with session.get(url, ssl=False) as response:
                            if response.status != 200:
                                errors.append(f"Case {case_id}: HTTP {response.status}")
                                continue
                            
                            text = await response.text()
                            
                            if not text.strip():
                                errors.append(f"Case {case_id}: Empty response")
                                continue
                            
                            if text.strip().startswith('<'):
                                errors.append(f"Case {case_id}: HTML error page")
                                continue
                            
                            try:
                                json_data = json.loads(text)
                                if "data" in json_data and isinstance(json_data["data"], dict):
                                    data_obj = json_data["data"]
                                    # Clean content using helper method
                                    raw_content = data_obj.get("docClob", "")
                                    cleaned_content = self._clean_doc_content(raw_content)
                                    
                                    results.append({
                                        "id": case_id,
                                        "title": data_obj.get("docTitle", ""),
                                        "subtitle": data_obj.get("docSubtitle", ""),
                                        "content": cleaned_content,
                                        "date": data_obj.get("publishDate", ""),
                                        "publish_date": data_obj.get("publishDate", "")
                                    })
                                else:
                                    errors.append(f"Case {case_id}: Invalid JSON structure")
                            except json.JSONDecodeError:
                                errors.append(f"Case {case_id}: JSON decode error")
                    
                    except Exception as e:
                        errors.append(f"Case {case_id}: {str(e)}")
                    
                    # Progress tracking
                    if (i + 1) % 10 == 0:
                        print(f"Processed {i + 1}/{len(case_ids)} cases")
                    
                    # Rate limiting
                    await asyncio.sleep(random.uniform(1, 3))
            
            print(f"Successfully fetched {len(results)} cases, {len(errors)} errors")
            if errors:
                print("Errors encountered:")
                for error in errors[:5]:  # Show first 5 errors
                    print(f"  {error}")
            
            return results
            
        except Exception as e:
            print(f"Error in batch fetch: {e}")
            raise
    
    async def test_connection(self, org_name: OrganizationType = OrganizationType.LOCAL):
        """Test connection to NFRA website and verify API endpoints"""
        try:
            print(f"=== CONNECTION TEST START ===")
            
            org_id = self.org_id_mapping[org_name]
            print(f"Testing with organization: {org_name} (ID: {org_id})")
            
            # Test 1: Check if base URL is accessible
            print(f"\n1. Testing base URL: {self.base_url}")
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                try:
                    async with session.get(self.base_url) as response:
                        print(f"   Base URL status: {response.status}")
                        print(f"   Base URL headers: {dict(response.headers)}")
                except Exception as e:
                    print(f"   Base URL test failed: {e}")
            
            # Test 2: Check summary API endpoint
            test_url = f"{self.summary_base_url}?itemId={org_id}&pageSize=1&pageIndex=1"
            print(f"\n2. Testing summary API: {test_url}")
            
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
                connector=aiohttp.TCPConnector(ssl=False)
            ) as session:
                try:
                    async with session.get(test_url) as response:
                        print(f"   Summary API status: {response.status}")
                        print(f"   Summary API headers: {dict(response.headers)}")
                        
                        if response.status == 200:
                            text = await response.text()
                            print(f"   Response length: {len(text)} characters")
                            print(f"   Response preview: {text[:300]}...")
                            
                            try:
                                json_data = json.loads(text)
                                print(f"   JSON structure valid: True")
                                print(f"   JSON keys: {list(json_data.keys()) if isinstance(json_data, dict) else 'Not a dict'}")
                                
                                if "data" in json_data:
                                    data_section = json_data["data"]
                                    if "rows" in data_section:
                                        rows = data_section["rows"]
                                        print(f"   Number of rows: {len(rows) if isinstance(rows, list) else 'Not a list'}")
                                        if rows:
                                            print(f"   Sample row keys: {list(rows[0].keys()) if isinstance(rows[0], dict) else 'Not a dict'}")
                                    else:
                                        print(f"   'rows' key missing, available keys: {list(data_section.keys()) if isinstance(data_section, dict) else 'N/A'}")
                                else:
                                    print(f"   'data' key missing")
                                    
                            except json.JSONDecodeError as json_err:
                                print(f"   JSON parse error: {json_err}")
                                
                        else:
                            error_text = await response.text()
                            print(f"   Error response: {error_text[:200]}...")
                            
                except Exception as e:
                    print(f"   Summary API test failed: {e}")
            
            # Test 3: Try alternative URLs or parameters
            print(f"\n3. Testing alternative configurations...")
            
            # Test with different page sizes
            for page_size in [5, 10, 18]:
                alt_url = f"{self.summary_base_url}?itemId={org_id}&pageSize={page_size}&pageIndex=1"
                print(f"   Testing pageSize={page_size}: {alt_url}")
                
                try:
                    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                        async with session.get(alt_url) as response:
                            print(f"     Status: {response.status}")
                            if response.status == 200:
                                text = await response.text()
                                try:
                                    json_data = json.loads(text)
                                    rows = json_data.get("data", {}).get("rows", [])
                                    print(f"     Found {len(rows)} rows")
                                except:
                                    print(f"     JSON parse failed")
                            break  # If one works, no need to test others
                except Exception as e:
                    print(f"     Failed: {e}")
            
            print(f"=== CONNECTION TEST END ===")
            return {"status": "completed", "message": "Connection test completed, check logs for details"}
            
        except Exception as e:
            print(f"FATAL ERROR in connection test: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": f"Connection test failed: {e}"}
    
    async def check_saved_files(self, org_name: OrganizationType = None):
        """Check what files have been saved in the cbirc directory"""
        try:
            print(f"=== CHECKING SAVED FILES ===")
            
            # Get the cbirc directory path
            cbirc_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), "cbirc")
            print(f"CBIRC directory: {cbirc_dir}")
            
            if not os.path.exists(cbirc_dir):
                print(f"CBIRC directory does not exist: {cbirc_dir}")
                return {"status": "error", "message": "CBIRC directory not found"}
            
            # List all CSV files in the directory
            import glob
            csv_files = glob.glob(os.path.join(cbirc_dir, "*.csv"))
            
            print(f"Found {len(csv_files)} CSV files in total")
            
            # Filter by organization if specified
            if org_name:
                org_name_str = self.org_name_mapping[org_name]
                org_files = [f for f in csv_files if org_name_str in os.path.basename(f)]
                print(f"Found {len(org_files)} files for organization {org_name} ({org_name_str})")
                files_to_check = org_files
            else:
                files_to_check = csv_files
            
            # Sort by modification time (newest first)
            files_to_check.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            
            # Check recent files (up to 10)
            file_info = []
            for filepath in files_to_check[:10]:
                try:
                    filename = os.path.basename(filepath)
                    file_size = os.path.getsize(filepath)
                    mod_time = os.path.getmtime(filepath)
                    mod_time_str = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d %H:%M:%S')
                    
                    # Try to read the file to get row count
                    try:
                        df = pd.read_csv(filepath)
                        row_count = len(df)
                        columns = list(df.columns)
                        sample_data = df.iloc[0].to_dict() if len(df) > 0 else {}
                    except Exception as read_err:
                        row_count = "Error reading file"
                        columns = []
                        sample_data = {}
                    
                    file_info.append({
                        "filename": filename,
                        "filepath": filepath,
                        "size_bytes": file_size,
                        "modified": mod_time_str,
                        "row_count": row_count,
                        "columns": columns[:5],  # First 5 columns
                        "sample_data": {k: str(v)[:50] for k, v in list(sample_data.items())[:3]}  # First 3 fields, truncated
                    })
                    
                    print(f"File: {filename}")
                    print(f"  Size: {file_size} bytes")
                    print(f"  Modified: {mod_time_str}")
                    print(f"  Rows: {row_count}")
                    print(f"  Columns: {columns[:5]}...")
                    print(f"  Sample: {sample_data}")
                    print()
                    
                except Exception as file_err:
                    print(f"Error checking file {filepath}: {file_err}")
                    file_info.append({
                        "filename": os.path.basename(filepath),
                        "error": str(file_err)
                    })
            
            print(f"=== FILE CHECK COMPLETE ===")
            
            return {
                "status": "completed",
                "cbirc_directory": cbirc_dir,
                "total_csv_files": len(csv_files),
                "checked_files": len(file_info),
                "files": file_info
            }
            
        except Exception as e:
            print(f"FATAL ERROR in check_saved_files: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": f"File check failed: {e}"}
    
    async def update_case_analysis(self, org_name: OrganizationType):
        """Update case analysis using AI processing"""
        try:
            print(f"Starting analysis update for {org_name}")
            
            # This would typically:
            # 1. Get unprocessed cases
            # 2. Send to AI service for analysis
            # 3. Update database with results
            
            await asyncio.sleep(1)  # Simulate processing
            
            print(f"Completed analysis update for {org_name}")
            return {"status": "completed"}
            
        except Exception as e:
            print(f"Error updating case analysis: {e}")
            raise

    async def get_pending_cases_for_update(self, org_name: OrganizationType) -> List[Dict[str, Any]]:
        """Get list of cases that need details update"""
        try:
            org_name_str = self.org_name_mapping[org_name]
            
            # Get existing summary data from CSV files
            summary_pattern = f"cbircsum{org_name_str}*.csv"
            summary_files = glob.glob(os.path.join(self.data_dir, summary_pattern))
            
            if not summary_files:
                return []
            
            # Load all summary data
            summary_dfs = []
            for file_path in summary_files:
                try:
                    df = pd.read_csv(file_path)
                    summary_dfs.append(df)
                except Exception as e:
                    print(f"Error reading summary file {file_path}: {e}")
            
            if not summary_dfs:
                return []
            
            # Combine all summary data
            all_summary = pd.concat(summary_dfs, ignore_index=True)
            all_summary.drop_duplicates(subset=['docId'], inplace=True)
            
            # Get existing detail data to find what's missing
            detail_pattern = f"cbircdtl{org_name_str}*.csv"
            detail_files = glob.glob(os.path.join(self.data_dir, detail_pattern))
            
            existing_detail_ids = set()
            for file_path in detail_files:
                try:
                    df = pd.read_csv(file_path)
                    if 'id' in df.columns:
                        existing_detail_ids.update(df['id'].astype(str).tolist())
                except Exception as e:
                    print(f"Error reading detail file {file_path}: {e}")
            
            # Filter to only cases that need details
            if 'docId' not in all_summary.columns:
                return []
            
            # Convert docId to string for comparison
            all_summary['docId'] = all_summary['docId'].astype(str)
            pending_cases = all_summary[~all_summary['docId'].isin(existing_detail_ids)]
            
            if pending_cases.empty:
                return []
            
            # Convert to list of dictionaries for API response
            pending_list = []
            for _, row in pending_cases.iterrows():
                case_data = {
                    'id': str(row.get('docId', '')),
                    'title': str(row.get('docTitle', row.get('title', ''))),
                    'subtitle': str(row.get('docSubtitle', row.get('subtitle', ''))),
                    'publish_date': str(row.get('publishDate', row.get('publish_date', ''))),
                    'content': (lambda content: content[:200] + '...' if len(content) > 200 else content)(self._clean_doc_content(row.get('docClob', row.get('content', ''))))
                }
                pending_list.append(case_data)
            
            return pending_list
            
        except Exception as e:
            print(f"Error getting pending cases: {e}")
            return []

    async def update_selected_case_details(self, org_name: OrganizationType, selected_case_ids: List[str]):
        """Update case details for selected cases only"""
        try:
            print(f"Starting selected case details update for {org_name}")
            print(f"Selected case IDs: {selected_case_ids}")
            
            org_name_str = self.org_name_mapping[org_name]
            
            # Get existing summary data
            summary_pattern = f"cbircsum{org_name_str}*.csv"
            summary_files = glob.glob(os.path.join(self.data_dir, summary_pattern))
            
            if not summary_files:
                return {
                    "status": "error",
                    "message": f"No summary data found for {org_name}",
                    "updated_cases": 0
                }
            
            # Load all summary data
            summary_dfs = []
            for file_path in summary_files:
                try:
                    df = pd.read_csv(file_path)
                    summary_dfs.append(df)
                except Exception as e:
                    print(f"Error reading summary file {file_path}: {e}")
            
            if not summary_dfs:
                return {
                    "status": "error",
                    "message": f"Could not load summary data for {org_name}",
                    "updated_cases": 0
                }
            
            # Combine all summary data
            all_summary = pd.concat(summary_dfs, ignore_index=True)
            all_summary.drop_duplicates(subset=['docId'], inplace=True)
            
            # Filter to only selected cases
            all_summary['docId'] = all_summary['docId'].astype(str)
            selected_cases = all_summary[all_summary['docId'].isin(selected_case_ids)]
            
            if selected_cases.empty:
                return {
                    "status": "error",
                    "message": f"No matching cases found for selected IDs",
                    "updated_cases": 0
                }
            
            print(f"Found {len(selected_cases)} cases to update")
            
            # Get existing detail data to avoid duplicates
            detail_pattern = f"cbircdtl{org_name_str}*.csv"
            detail_files = glob.glob(os.path.join(self.data_dir, detail_pattern))
            
            existing_detail_ids = set()
            for file_path in detail_files:
                try:
                    df = pd.read_csv(file_path)
                    if 'id' in df.columns:
                        existing_detail_ids.update(df['id'].astype(str).tolist())
                except Exception as e:
                    print(f"Error reading detail file {file_path}: {e}")
            
            # Filter out cases that already have details
            cases_to_update = selected_cases[~selected_cases['docId'].isin(existing_detail_ids)]
            
            if cases_to_update.empty:
                return {
                    "status": "completed",
                    "message": f"All selected cases already have details",
                    "updated_cases": 0
                }
            
            print(f"Found {len(cases_to_update)} new cases needing details")
            
            # Fetch details for selected cases
            doc_ids = cases_to_update['docId'].tolist()
            detail_results = []
            error_count = 0
            
            # Create temporary file for saving progress
            timestamp = self._get_timestamp()
            temp_filename = f"temp_selected_cbircdtl{org_name_str}_{timestamp}"
            temp_batch_size = 5  # Save every 5 records for selected updates
            
            connector = aiohttp.TCPConnector(limit=10, limit_per_host=5, ssl=False)
            timeout = aiohttp.ClientTimeout(total=30, connect=10, sock_read=20)
            
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                for i, doc_id in enumerate(doc_ids):
                    try:
                        detail_url = f"{self.detail_base_url}={doc_id}.json"
                        print(f"Fetching details for case {i+1}/{len(doc_ids)}: {doc_id} - URL: {detail_url}")
                        detail_data = await self._fetch_case_detail(session, str(doc_id))
                        
                        if detail_data:
                            # Format detail data with English field names
                            # Use the already cleaned content from _fetch_case_detail
                            cleaned_content = detail_data.get("content", "")
                            formatted_detail = {
                                "title": detail_data.get("title", ""),
                                "subtitle": detail_data.get("subtitle", ""),
                                "date": detail_data.get("publish_date", ""),
                                "doc": cleaned_content,
                                "id": str(doc_id)
                            }
                            detail_results.append(formatted_detail)
                            print(f"✓ Successfully fetched details for case {doc_id}")
                            print(f"DEBUG: Saved doc field preview: {cleaned_content[:200]}")
                            print(f"DEBUG: Doc field contains HTML tags: {'<' in cleaned_content and '>' in cleaned_content}")
                            print(f"DEBUG: Doc field length: {len(cleaned_content)}")
                        
                        # Save temporary progress every few records
                        if len(detail_results) % temp_batch_size == 0 and detail_results:
                            temp_df = pd.DataFrame(detail_results)
                            temp_filepath = os.path.join(self.data_dir, f"{temp_filename}.csv")
                            temp_df.to_csv(temp_filepath, index=False, encoding='utf-8-sig')
                            print(f"Saved temporary progress: {len(detail_results)} cases to {temp_filepath}")
                        
                        # Rate limiting
                        delay = random.uniform(2, 4)
                        await asyncio.sleep(delay)
                        
                    except Exception as e:
                        error_count += 1
                        print(f"✗ Error fetching details for case {doc_id}: {e}")
                        continue
            
            # Save final results to CSV
            updated_cases = 0
            if detail_results:
                df_details = pd.DataFrame(detail_results)
                final_filename = f"cbircdtl{org_name_str}_selected_{timestamp}"
                final_filepath = self._save_to_csv(df_details, final_filename)
                updated_cases = len(detail_results)
                
                print(f"Saved {updated_cases} case details to {final_filepath}")
                
                # Clean up temporary file
                temp_filepath = os.path.join(self.data_dir, f"{temp_filename}.csv")
                if os.path.exists(temp_filepath):
                    try:
                        os.remove(temp_filepath)
                        print(f"Cleaned up temporary file: {temp_filepath}")
                    except Exception as e:
                        print(f"Could not clean up temporary file: {e}")
            else:
                print("No case details were successfully fetched")
            
            result = {
                "status": "completed",
                "message": f"Selected case details update completed",
                "requested_cases": len(selected_case_ids),
                "cases_to_update": len(cases_to_update),
                "updated_cases": updated_cases,
                "error_count": error_count,
                "success_rate": f"{(updated_cases / len(cases_to_update) * 100):.1f}%" if len(cases_to_update) > 0 else "0%"
            }
            
            print(f"Final result: {result}")
            return result
            
        except Exception as e:
            print(f"FATAL ERROR in update_selected_case_details: {e}")
            traceback.print_exc()
            raise


# Global service instance
scraper_service = ScraperService()