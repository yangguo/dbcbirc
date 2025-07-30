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
                        content=case_data.get('content', case_data.get('docClob', '')),
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
                                'content': row.get('docClob', ''),
                                # Keep original data for reference
                                **row
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
                    return {
                        "id": case_id,
                        "title": data_obj.get("docTitle", ""),
                        "subtitle": data_obj.get("docSubtitle", ""),
                        "content": data_obj.get("docClob", ""),
                        "publish_date": data_obj.get("publishDate", ""),
                        **data_obj  # Include all original fields
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
    
    async def update_case_details(self, org_name: OrganizationType):
        """Update case details for an organization - self-contained implementation"""
        try:
            print(f"Starting case details update for {org_name}")
            
            # Check if database connection is enabled
            if not db_manager._connection_enabled:
                print("Database connection is disabled - skipping case detail updates")
                return {
                    "status": "skipped",
                    "message": "Database connection disabled",
                    "updated_cases": 0
                }
            
            # Check if database is connected
            if not db_manager.client:
                print("Database not connected - skipping case detail updates")
                return {
                    "status": "skipped", 
                    "message": "Database not connected",
                    "updated_cases": 0
                }
            
            org_name_str = self.org_name_mapping[org_name]
            collection_name = f"cases_{org_name_str}"
            
            # Get cases that need detail updates (missing content)
            collection = db_manager.get_collection(collection_name)
            
            # Find cases with empty or missing content
            cursor = collection.find({
                "$or": [
                    {"content": {"$exists": False}},
                    {"content": ""},
                    {"content": None}
                ]
            })
            
            cases_to_update = []
            async for doc in cursor:
                cases_to_update.append({
                    "id": doc["id"],
                    "title": doc.get("title", ""),
                    "subtitle": doc.get("subtitle", "")
                })
            
            print(f"Found {len(cases_to_update)} cases needing detail updates")
            
            if not cases_to_update:
                return {
                    "status": "completed",
                    "updated_cases": 0
                }
            
            # Fetch details in batches
            updated_count = 0
            errors = []
            
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
                connector=aiohttp.TCPConnector(ssl=False)
            ) as session:
                
                for i, case in enumerate(cases_to_update):
                    try:
                        print(f"Updating case {i+1}/{len(cases_to_update)}: {case['id']}")
                        
                        # Fetch detailed content
                        detail_data = await self._fetch_case_detail(session, case['id'])
                        
                        # Update the case in database
                        await collection.update_one(
                            {"id": case['id']},
                            {"$set": {
                                "content": detail_data.get("content", ""),
                                "updated_at": datetime.now()
                            }}
                        )
                        
                        updated_count += 1
                        
                        # Rate limiting
                        delay = random.uniform(1, 3)
                        await asyncio.sleep(delay)
                        
                    except Exception as e:
                        error_msg = f"Case {case['id']}: {str(e)}"
                        print(f"ERROR: {error_msg}")
                        errors.append(error_msg)
                        continue
            
            print(f"Updated details for {updated_count} cases")
            
            return {
                "status": "completed",
                "updated_cases": updated_count,
                "errors": len(errors),
                "error_details": errors
            }
            
        except Exception as e:
            print(f"Error updating case details: {e}")
            print("Continuing without database updates...")
            return {
                "status": "error",
                "message": str(e),
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
                        
                    return {
                        "id": case_id,
                        "title": data_obj.get("docTitle", ""),
                        "subtitle": data_obj.get("docSubtitle", ""),
                        "content": data_obj.get("docClob", ""),
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
                                    results.append({
                                        "id": case_id,
                                        "title": data_obj.get("docTitle", ""),
                                        "subtitle": data_obj.get("docSubtitle", ""),
                                        "content": data_obj.get("docClob", ""),
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


# Global service instance
scraper_service = ScraperService()