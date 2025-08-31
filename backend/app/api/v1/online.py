from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.case_service import case_service
from app.core.database import db_manager
from app.core.config import settings
import pandas as pd
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


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
        if db_manager._connection_enabled and db_manager.client:
            try:
                online_collection = db_manager.get_sync_collection(settings.MONGODB_COLLECTION)
                online_data_cursor = online_collection.find({})
                online_data_list = list(online_data_cursor)
                
                # 匹配原始函数逻辑：使用unique id count作为count
                unique_count = len(set(doc.get("id") for doc in online_data_list if doc.get("id")))
                online_data = {
                    "count": unique_count,
                    "unique_ids": unique_count
                }
            except Exception as e:
                logger.error(f"Error getting online data stats: {e}")
        
        # 8. 计算差异数据 (完全按照uplink_cbircsum函数的逻辑)
        diff_data = {"count": 0, "unique_ids": 0}
        if not analysis_df_dedup.empty:
            # 合并分析数据和事件数据 (对应uplink_cbircsum中的alldf = pd.merge(analysisdf, eventdf, on="id", how="left"))
            if not detail_df_dedup.empty:
                merged_df = pd.merge(analysis_df_dedup, detail_df_dedup, on="id", how="left")
            else:
                merged_df = analysis_df_dedup.copy()
            
            if db_manager._connection_enabled and db_manager.client:
                try:
                    online_collection = db_manager.get_sync_collection(settings.MONGODB_COLLECTION)
                    online_data_cursor = online_collection.find({})
                    online_data_list = list(online_data_cursor)
                    
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
                except Exception as e:
                    logger.error(f"Error calculating diff data stats: {e}")
                    # If can't access online data, all local data is diff
                    diff_data = {
                        "count": len(merged_df),
                        "unique_ids": merged_df["id"].nunique() if not merged_df.empty else 0
                    }
            else:
                # If database not connected, all local data is diff
                diff_data = {
                    "count": len(merged_df),
                    "unique_ids": merged_df["id"].nunique() if not merged_df.empty else 0
                }
        
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
        
        # Get online data from MongoDB
        try:
            online_collection = db_manager.get_sync_collection("cbircanalysis")
            online_cursor = online_collection.find({})
            online_data = pd.DataFrame(list(online_cursor))
            
            # Get different data (cases not in online data)
            if not online_data.empty:
                diff_data_df = merged_df[~merged_df["id"].isin(online_data["id"])]
            else:
                diff_data_df = merged_df
                
        except Exception as e:
            logger.error(f"Error accessing online data: {e}")
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
            collection = db_manager.get_sync_collection("cbircanalysis")
            
            # Get online data to find differences
            online_cursor = collection.find({})
            online_data = pd.DataFrame(list(online_cursor))
            
            # Get different data (cases not in online data)
            if not online_data.empty:
                diff_data_df = merged_df[~merged_df["id"].isin(online_data["id"])]
            else:
                diff_data_df = merged_df
            
            # Filter out rows with null main violation facts
            diff_data_df = diff_data_df[diff_data_df.get("event", "").notna()]
            
            # Remove duplicates by id
            diff_data_df = diff_data_df.drop_duplicates(subset=["id"])
            
            # Fill NaN values
            diff_data_df = diff_data_df.fillna("")
            
            if diff_data_df.empty:
                return {
                    "message": "No new cases to update",
                    "timestamp": datetime.now().isoformat(),
                    "status": "success",
                    "updated_count": 0
                }
            
            # Convert to records and insert in batches
            records = diff_data_df.to_dict("records")
            batch_size = 10000
            total_inserted = 0
            
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                result = collection.insert_many(batch)
                total_inserted += len(result.inserted_ids)
            
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