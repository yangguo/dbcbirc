from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from typing import List, Dict, Any
from app.services.case_service import case_service
from app.core.database import db_manager
from app.core.config import settings
from app.models.case import CaseSearchRequest, CaseSearchResponse, CaseDetail
import pandas as pd
from datetime import datetime, date
import logging
import asyncio
import re
import math

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def check_online_health():
    """Check the health of online data connection"""
    try:
        if not db_manager._connection_enabled:
            return {
                "status": "disabled",
                "message": "Database connection is disabled",
                "mongodb_connected": False
            }
        
        if not db_manager.client:
            return {
                "status": "disconnected", 
                "message": "Database client not initialized",
                "mongodb_connected": False
            }
        
        # Test connection with short timeout
        try:
            await asyncio.wait_for(db_manager.client.admin.command('ping'), timeout=5)
            
            # Test collection access
            online_data_list = await get_online_data_with_timeout(timeout=5)
            
            return {
                "status": "healthy",
                "message": "Database connection is working",
                "mongodb_connected": True,
                "online_data_count": len(online_data_list) if online_data_list else 0
            }
        except asyncio.TimeoutError:
            return {
                "status": "timeout",
                "message": "Database connection timed out",
                "mongodb_connected": False
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Database connection error: {str(e)}",
                "mongodb_connected": False
            }
            
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        return {
            "status": "error",
            "message": f"Health check failed: {str(e)}",
            "mongodb_connected": False
        }


async def get_online_data_with_timeout(timeout: int = 10):
    """Get online data from MongoDB with timeout"""
    try:
        if not db_manager._connection_enabled or not db_manager.client:
            return []
        
        # Use async timeout for MongoDB operations
        online_collection = db_manager.get_collection(settings.MONGODB_COLLECTION)
        cursor = online_collection.find({})
        
        # Convert cursor to list with timeout
        online_data_list = await asyncio.wait_for(cursor.to_list(length=None), timeout=timeout)
        return online_data_list
    except asyncio.TimeoutError:
        logger.warning(f"MongoDB async operation timed out after {timeout} seconds, trying sync fallback")
        # Fallback to sync client for better timeout handling
        sync_result = get_online_ids_sync_with_timeout(timeout=timeout)
        logger.info(f"Sync fallback returned {len(sync_result)} records")
        return sync_result
    except Exception as e:
        logger.error(f"Error getting online data: {e}")
        return []


def get_online_data_sync_with_timeout(timeout: int = 10):
    """Get online data from MongoDB using sync client with timeout"""
    try:
        if not db_manager._connection_enabled or not db_manager.sync_client:
            return []
        
        # Set socket timeout on the collection level
        online_collection = db_manager.get_sync_collection(settings.MONGODB_COLLECTION)
        
        # Use find with timeout
        cursor = online_collection.find({}).max_time_ms(timeout * 1000)  # Convert to milliseconds
        online_data_list = list(cursor)
        return online_data_list
    except Exception as e:
        logger.error(f"Error getting online data with sync client: {e}")
        return []


def get_online_ids_sync_with_timeout(timeout: int = 10) -> List[str]:
    """Get only online data IDs from MongoDB using sync client with timeout - more efficient for diff calculation"""
    try:
        logger.info(f"Starting sync operation with timeout {timeout} seconds")
        if not db_manager._connection_enabled or not db_manager.sync_client:
            logger.error("Database connection disabled or sync client not available")
            return []
        
        # Set socket timeout on the collection level
        online_collection = db_manager.get_sync_collection(settings.MONGODB_COLLECTION)
        
        # Only fetch the id field to reduce data transfer and improve performance
        cursor = online_collection.find({}, {"id": 1, "_id": 0}).max_time_ms(timeout * 1000)
        
        import time
        start_time = time.time()
        online_data_list = list(cursor)
        elapsed_time = time.time() - start_time
        
        # Extract just the ID strings from the documents
        online_ids = [doc["id"] for doc in online_data_list if "id" in doc]
        
        logger.info(f"Sync operation completed, collected {len(online_ids)} IDs in {elapsed_time:.2f} seconds")
        return online_ids
    except Exception as e:
        logger.error(f"Error getting online IDs with sync client: {e}")
        return []


@router.get("/stats")
async def get_online_stats():
    """获取案例数据统计 - 参考uplink_cbircsum函数逻辑"""
    try:
        # 1. 获取事件数据 (对应uplink_cbircsum中的eventdf)
        detail_df = await case_service.get_case_detail("")
        # 去重处理
        detail_df_dedup = detail_df.drop_duplicates(subset=["id"]) if not detail_df.empty else pd.DataFrame()
        
        # 2. 获取分析数据 (对应uplink_cbircsum中的analysisdf)
        analysis_df = await case_service.get_case_analysis("")
        # 去重处理
        analysis_df_dedup = analysis_df.drop_duplicates(subset=["id"]) if not analysis_df.empty else pd.DataFrame()
        
        # 3. 获取分类数据 (对应uplink_cbircsum中的amountdf，通过get_cbirccat获取)
        category_df = await case_service.get_case_categories()
        # 去重处理
        category_df_dedup = category_df.drop_duplicates(subset=["id"]) if not category_df.empty else pd.DataFrame()
        
        # 4. 计算事件数据统计 (使用去重后的数据避免冗余统计)
        event_data = {
            "count": len(detail_df_dedup) if not detail_df_dedup.empty else 0,
            "unique_ids": detail_df_dedup["id"].nunique() if not detail_df_dedup.empty and "id" in detail_df_dedup.columns else 0
        }
        
        # 5. 计算分析数据统计 (使用去重后的数据避免冗余统计)
        analysis_data = {
            "count": len(analysis_df_dedup) if not analysis_df_dedup.empty else 0,
            "unique_ids": analysis_df_dedup["id"].nunique() if not analysis_df_dedup.empty and "id" in analysis_df_dedup.columns else 0
        }
        
        # 6. 计算分类数据统计 (对应uplink_cbircsum中的amountdf)
        amount_data = {
            "count": len(category_df) if not category_df.empty else 0,
            "unique_ids": category_df["id"].nunique() if not category_df.empty and "id" in category_df.columns else 0
        }
        
        # 7. 获取在线数据统计 (对应uplink_cbircsum中的online_data)
        online_data = {"count": 0, "unique_ids": 0}
        online_data_list = await get_online_data_with_timeout(timeout=20)  # Increased timeout for large dataset
        
        if online_data_list:
            # 匹配原始函数逻辑：使用unique id count作为count
            unique_count = len(set(doc.get("id") for doc in online_data_list if doc.get("id")))
            online_data = {
                "count": unique_count,
                "unique_ids": unique_count
            }
        
        # 8. 计算差异数据 (完全按照uplink_cbircsum函数的逻辑)
        diff_data = {"count": 0, "unique_ids": 0}
        if not analysis_df_dedup.empty:
            # 合并分析数据和事件数据 (对应uplink_cbircsum中的alldf = pd.merge(analysisdf, eventdf, on="id", how="left"))
            if not detail_df_dedup.empty:
                merged_df = pd.merge(analysis_df_dedup, detail_df_dedup, on="id", how="left")
            else:
                merged_df = analysis_df_dedup.copy()
            
            # Get online data with timeout - try to get IDs only for better performance
            online_data_list = await get_online_data_with_timeout(timeout=20)  # Increased timeout
            
            if online_data_list:
                # 筛选出未上线的数据 (对应uplink_cbircsum中的diff_data = alldf[~alldf["id"].isin(online_data["id"])])
                online_ids = set(doc.get("id") for doc in online_data_list if doc.get("id"))
                diff_data_filtered = merged_df[~merged_df["id"].isin(online_ids)]
                
                # 进一步筛选有违法事实的案例 (对应uplink_cbircsum中的diff_data4 = diff_data3[diff_data3["主要违法违规事实"].notnull()])
                # Calculate diff_data by merging analysis and event data, then filtering
                diff_data_df = diff_data_filtered
                
                # Further filter for cases with violation facts (event data) - matching original function logic
                # Original function filters: diff_data4 = diff_data3[diff_data3["主要违法违规事实"].notnull()]
                if "event" in diff_data_df.columns:
                    diff_data_with_events = diff_data_df[diff_data_df["event"].notna() & (diff_data_df["event"] != "")]
                else:
                    # 如果没有event字段，使用所有未上线的数据
                    diff_data_with_events = diff_data_df
                
                diff_data = {
                    "count": len(diff_data_with_events),
                    "unique_ids": diff_data_with_events["id"].nunique() if not diff_data_with_events.empty else 0
                }
                
                logger.info(f"Diff calculation: Total merged: {len(merged_df)}, Online IDs: {len(online_ids)}, Filtered: {len(diff_data_filtered)}, With events: {len(diff_data_with_events)}")
            else:
                # If can't access online data due to timeout or error, use a conservative estimate
                # Filter for cases with violation facts first
                if "event" in merged_df.columns:
                    diff_data_with_events = merged_df[merged_df["event"].notna() & (merged_df["event"] != "")]
                else:
                    diff_data_with_events = merged_df
                
                diff_data = {
                    "count": len(diff_data_with_events),
                    "unique_ids": diff_data_with_events["id"].nunique() if not diff_data_with_events.empty else 0
                }
                
                logger.warning(f"Could not access online data for diff calculation, using all local data with events: {len(diff_data_with_events)}")
        
        result = {
            "analysis_data": analysis_data,
            "event_data": event_data,
            "amount_data": amount_data,
            "online_data": online_data,
            "diff_data": diff_data
        }
        
        logger.info(f"Retrieved online stats: {result}")
        return result
        
    except Exception as e:
        logger.error(f"获取统计数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")


@router.get("/diff-data")
async def get_case_diff_data():
    """Get case diff data for online comparison"""
    try:
        # Check if database connection is enabled
        if not db_manager._connection_enabled:
            logger.warning("Database connection is disabled")
            return []
        
        if not db_manager.client:
            logger.warning("Database not connected")
            return []
        
        # Get case detail and analysis data
        detail_df = await case_service.get_case_detail("")
        analysis_df = await case_service.get_case_analysis("")
        
        if detail_df.empty:
            return []
        
        # Merge with analysis data if available
        merged_df = detail_df.copy()
        if not analysis_df.empty:
            merged_df = pd.merge(merged_df, analysis_df, on="id", how="left")
        
        # Get online data from MongoDB with timeout
        online_data_list = await get_online_data_with_timeout(timeout=20)
        
        if online_data_list:
            online_data = pd.DataFrame(online_data_list)
            # Get different data (cases not in online data)
            if not online_data.empty:
                diff_data_df = merged_df[~merged_df["id"].isin(online_data["id"])]
            else:
                diff_data_df = merged_df
        else:
            # If can't access online data, return all local data as diff
            diff_data_df = merged_df
        
        # Filter out rows with null main violation facts
        diff_data_df = diff_data_df[diff_data_df.get("event", "").notna()]
        
        # Convert to diff data format
        diff_data = []
        for _, row in diff_data_df.head(100).iterrows():  # Limit to first 100 for performance
            diff_item = {
                "id": str(row.get("id", "")),
                "title": str(row.get("title", row.get("标题", ""))),
                "subtitle": str(row.get("subtitle", row.get("文号", ""))),
                "publish_date": str(row.get("publish_date", row.get("发布日期", ""))),
                "decision_number": str(row.get("wenhao", row.get("文号", ""))),
                "punished_party": str(row.get("people", row.get("当事人", ""))),
                "violation_facts": str(row.get("event", row.get("违法事实", ""))),
                "legal_basis": str(row.get("law", row.get("法律依据", ""))),
                "penalty_decision": str(row.get("penalty", row.get("处罚决定", ""))),
                "authority_name": str(row.get("org", row.get("机关名称", ""))),
                "decision_date": str(row.get("penalty_date", row.get("作出处罚决定的日期", "")))
            }
            diff_data.append(diff_item)
        
        logger.info(f"Retrieved {len(diff_data)} diff data items")
        return diff_data
        
    except Exception as e:
        logger.error(f"Error in get_case_diff_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update")
async def update_online_cases():
    """Update online cases by inserting diff data to MongoDB"""
    try:
        # Check if database connection is enabled
        if not db_manager._connection_enabled:
            logger.warning("Database connection is disabled")
            raise HTTPException(status_code=503, detail="Database connection is disabled")
        
        if not db_manager.client:
            logger.warning("Database not connected")
            raise HTTPException(status_code=503, detail="Database not connected")
        
        # Get case detail and analysis data
        detail_df = await case_service.get_case_detail("")
        analysis_df = await case_service.get_case_analysis("")
        
        if detail_df.empty:
            return {
                "message": "No case data available for update",
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "updated_count": 0
            }
        
        # Merge with analysis data if available
        merged_df = detail_df.copy()
        if not analysis_df.empty:
            merged_df = pd.merge(merged_df, analysis_df, on="id", how="left")
        
        try:
            collection = db_manager.get_collection("cbircanalysis")
            
            # Get online data to find differences with timeout
            online_data_list = await get_online_data_with_timeout(timeout=25)
            
            if online_data_list:
                online_data = pd.DataFrame(online_data_list)
                # Get different data (cases not in online data)
                if not online_data.empty:
                    diff_data_df = merged_df[~merged_df["id"].isin(online_data["id"])]
                else:
                    diff_data_df = merged_df
            else:
                # If can't access online data, treat all data as new
                diff_data_df = merged_df
            
            # Filter out rows with null main violation facts
            diff_data_df = diff_data_df[diff_data_df.get("event", "").notna()]
            
            # Remove duplicates by id
            diff_data_df = diff_data_df.drop_duplicates(subset=["id"])
            
            # Select and rename columns to match MongoDB structure (following dbcbirc.py uplink_cbircsum logic)
            required_columns = [
                "标题", "文号", "发布日期", "id", "wenhao", "people", "event", "law", "penalty", "org", "date"
            ]
            
            # Filter to only include required columns that exist
            available_columns = [col for col in required_columns if col in diff_data_df.columns]
            diff_data_selected = diff_data_df[available_columns].copy()
            
            # Rename columns to Chinese field names for MongoDB
            column_mapping = {
                "wenhao": "行政处罚决定书文号",
                "people": "被处罚当事人", 
                "event": "主要违法违规事实",
                "law": "行政处罚依据",
                "penalty": "行政处罚决定",
                "org": "作出处罚决定的机关名称",
                "date": "作出处罚决定的日期"
            }
            
            # Apply column renaming
            diff_data_renamed = diff_data_selected.rename(columns=column_mapping)
            
            # Convert date columns to datetime if they exist
            if "发布日期" in diff_data_renamed.columns:
                diff_data_renamed["发布日期"] = pd.to_datetime(diff_data_renamed["发布日期"], errors='coerce')
            
            # Fill NaN values
            diff_data_df = diff_data_renamed.fillna("")
            
            if diff_data_df.empty:
                return {
                    "message": "No new cases to update",
                    "timestamp": datetime.now().isoformat(),
                    "status": "success",
                    "updated_count": 0
                }
            
            # Convert to records and insert in batches with timeout
            records = diff_data_df.to_dict("records")
            batch_size = 1000  # Reduced batch size for better timeout handling
            total_inserted = 0
            
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                try:
                    # Use async insert with timeout
                    result = await asyncio.wait_for(
                        collection.insert_many(batch), 
                        timeout=30  # 30 seconds timeout for batch insert
                    )
                    total_inserted += len(result.inserted_ids)
                except asyncio.TimeoutError:
                    logger.error(f"Timeout inserting batch {i//batch_size + 1}")
                    raise HTTPException(status_code=504, detail=f"Database operation timed out during batch insert")
                except Exception as e:
                    logger.error(f"Error inserting batch {i//batch_size + 1}: {e}")
                    raise HTTPException(status_code=500, detail=f"Database error during batch insert: {str(e)}")
            
            logger.info(f"Inserted {total_inserted} new cases to cbircanalysis collection")
            
            return {
                "message": "Online cases update completed successfully",
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "updated_count": total_inserted
            }
            
        except Exception as e:
            logger.error(f"Error updating online cases in MongoDB: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update online cases: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
            logger.error(f"Error in update_online_cases: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=CaseSearchResponse)
async def search_online_cases(search_request: CaseSearchRequest):
    """Search online cases from MongoDB based on criteria"""
    try:
        # Check if database connection is enabled
        if not db_manager._connection_enabled:
            logger.warning("Database connection is disabled")
            return CaseSearchResponse(
                cases=[],
                total=0,
                page=search_request.page,
                page_size=search_request.page_size,
                total_pages=0
            )
        
        if not db_manager.client:
            logger.warning("Database not connected")
            return CaseSearchResponse(
                cases=[],
                total=0,
                page=search_request.page,
                page_size=search_request.page_size,
                total_pages=0
            )
        
        # Get online data from MongoDB
        collection = db_manager.get_collection(settings.MONGODB_COLLECTION)
        
        # Build MongoDB query
        query = {}
        
        # Date range filter
        if search_request.start_date or search_request.end_date:
            date_filter = {}
            if search_request.start_date:
                date_filter["$gte"] = search_request.start_date
            if search_request.end_date:
                date_filter["$lte"] = search_request.end_date
            query["发布日期"] = date_filter
        
        # Text search filters
        if search_request.title_text:
            query["标题"] = {"$regex": search_request.title_text, "$options": "i"}
        
        if search_request.wenhao_text:
            query["$or"] = [
                {"文号": {"$regex": search_request.wenhao_text, "$options": "i"}},
                {"行政处罚决定书文号": {"$regex": search_request.wenhao_text, "$options": "i"}}
            ]
        
        if search_request.people_text:
            query["被处罚当事人"] = {"$regex": search_request.people_text, "$options": "i"}
        
        if search_request.event_text:
            query["主要违法违规事实"] = {"$regex": search_request.event_text, "$options": "i"}
        
        if search_request.law_text:
            query["行政处罚依据"] = {"$regex": search_request.law_text, "$options": "i"}
        
        if search_request.penalty_text:
            query["行政处罚决定"] = {"$regex": search_request.penalty_text, "$options": "i"}
        
        if search_request.org_text:
            query["作出处罚决定的机关名称"] = {"$regex": search_request.org_text, "$options": "i"}
        
        if search_request.industry:
            query["industry"] = {"$regex": search_request.industry, "$options": "i"}
        
        if search_request.province:
            query["province"] = {"$regex": search_request.province, "$options": "i"}
        
        # General keyword search across multiple fields
        if search_request.keyword:
            keyword_regex = {"$regex": search_request.keyword, "$options": "i"}
            query["$or"] = [
                {"标题": keyword_regex},
                {"文号": keyword_regex},
                {"被处罚当事人": keyword_regex},
                {"主要违法违规事实": keyword_regex},
                {"行政处罚依据": keyword_regex},
                {"行政处罚决定": keyword_regex},
                {"作出处罚决定的机关名称": keyword_regex}
            ]
        
        # Get total count
        total = await collection.count_documents(query)
        
        # Calculate pagination
        total_pages = math.ceil(total / search_request.page_size)
        skip = (search_request.page - 1) * search_request.page_size
        
        # Execute search with pagination
        cursor = collection.find(query).skip(skip).limit(search_request.page_size)
        documents = await cursor.to_list(length=search_request.page_size)
        
        # Convert to CaseDetail objects
        cases = []
        for doc in documents:
            # Parse date fields
            publish_date = doc.get("发布日期")
            if isinstance(publish_date, str):
                try:
                    publish_date = datetime.strptime(publish_date, "%Y-%m-%d").date()
                except:
                    publish_date = date.today()
            elif isinstance(publish_date, datetime):
                publish_date = publish_date.date()
            elif not isinstance(publish_date, date):
                publish_date = date.today()
            
            penalty_date = doc.get("作出处罚决定的日期")
            if isinstance(penalty_date, str):
                try:
                    penalty_date = datetime.strptime(penalty_date, "%Y-%m-%d").date()
                except:
                    penalty_date = None
            elif isinstance(penalty_date, datetime):
                penalty_date = penalty_date.date()
            elif not isinstance(penalty_date, date):
                penalty_date = None
            
            # Extract penalty amount from penalty decision text
            amount = None
            penalty_text = doc.get("行政处罚决定", "")
            if penalty_text:
                # Look for monetary amounts in the penalty text
                amount_match = re.search(r'(\d+(?:\.\d+)?)万?元', penalty_text)
                if amount_match:
                    amount_str = amount_match.group(1)
                    amount = float(amount_str)
                    if '万' in amount_match.group(0):
                        amount *= 10000
            
            case = CaseDetail(
                id=str(doc.get("id", doc.get("_id", ""))),
                title=doc.get("标题", ""),
                subtitle=doc.get("文号", ""),
                publish_date=publish_date,
                content=doc.get("主要违法违规事实", ""),
                wenhao=doc.get("行政处罚决定书文号", doc.get("文号", "")),
                people=doc.get("被处罚当事人", ""),
                event=doc.get("主要违法违规事实", ""),
                law=doc.get("行政处罚依据", ""),
                penalty=doc.get("行政处罚决定", ""),
                org=doc.get("作出处罚决定的机关名称", ""),
                penalty_date=penalty_date,
                amount=amount,
                province=doc.get("province", ""),
                industry=doc.get("industry", "")
            )
            cases.append(case)
        
        return CaseSearchResponse(
            cases=cases,
            total=total,
            page=search_request.page,
            page_size=search_request.page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Error searching online cases: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def export_online_cases_csv(
    start_date: str = None,
    end_date: str = None,
    keyword: str = None,
    title_text: str = None,
    wenhao_text: str = None,
    people_text: str = None,
    event_text: str = None,
    law_text: str = None,
    penalty_text: str = None,
    org_text: str = None,
    industry: str = None,
    province: str = None,
    min_penalty: float = None
):
    """Export online cases to CSV format"""
    try:
        # Check if database connection is enabled
        if not db_manager._connection_enabled:
            logger.warning("Database connection is disabled")
            raise HTTPException(status_code=503, detail="Database connection is disabled")
        
        if not db_manager.client:
            logger.warning("Database not connected")
            raise HTTPException(status_code=503, detail="Database not connected")
        
        # Get online data from MongoDB
        collection = db_manager.get_collection(settings.MONGODB_COLLECTION)
        
        # Build query from query parameters
        query = {}
        
        # Date range filter
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            query["发布日期"] = date_filter
        
        # Text search filters
        text_filters = []
        if title_text:
            text_filters.append({"标题": {"$regex": title_text, "$options": "i"}})
        if wenhao_text:
            text_filters.append({"文号": {"$regex": wenhao_text, "$options": "i"}})
        if people_text:
            text_filters.append({"被处罚当事人": {"$regex": people_text, "$options": "i"}})
        if event_text:
            text_filters.append({"主要违法违规事实": {"$regex": event_text, "$options": "i"}})
        if law_text:
            text_filters.append({"行政处罚依据": {"$regex": law_text, "$options": "i"}})
        if penalty_text:
            text_filters.append({"行政处罚决定": {"$regex": penalty_text, "$options": "i"}})
        if org_text:
            text_filters.append({"作出处罚决定的机关名称": {"$regex": org_text, "$options": "i"}})
        if industry:
            text_filters.append({"行业": {"$regex": industry, "$options": "i"}})
        if province:
            text_filters.append({"省份": {"$regex": province, "$options": "i"}})
        
        if text_filters:
            query["$and"] = text_filters
        
        # General keyword search
        if keyword:
            keyword_regex = {"$regex": keyword, "$options": "i"}
            query["$or"] = [
                {"标题": keyword_regex},
                {"文号": keyword_regex},
                {"被处罚当事人": keyword_regex},
                {"主要违法违规事实": keyword_regex},
                {"行政处罚依据": keyword_regex},
                {"行政处罚决定": keyword_regex},
                {"作出处罚决定的机关名称": keyword_regex}
            ]
        
        # Get all matching documents
        cursor = collection.find(query)
        documents = await cursor.to_list(length=None)
        
        # Convert to DataFrame for CSV export
        if not documents:
            # Return empty CSV structure
            df = pd.DataFrame(columns=[
                "标题", "文号", "发布日期", "被处罚当事人", "主要违法违规事实",
                "行政处罚依据", "行政处罚决定", "作出处罚决定的机关名称", "作出处罚决定的日期"
            ])
        else:
            df = pd.DataFrame(documents)
            
            # Select and reorder columns for export
            export_columns = [
                "标题", "文号", "发布日期", "被处罚当事人", "主要违法违规事实",
                "行政处罚依据", "行政处罚决定", "作出处罚决定的机关名称", "作出处罚决定的日期"
            ]
            
            # Keep only available columns
            available_columns = [col for col in export_columns if col in df.columns]
            df = df[available_columns]
        
        # Convert to CSV
        csv_content = df.to_csv(index=False, encoding='utf-8-sig')
        
        # Return CSV as response with proper headers
        filename = f"online_cases_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Error exporting online cases: {e}")
        raise HTTPException(status_code=500, detail=str(e))