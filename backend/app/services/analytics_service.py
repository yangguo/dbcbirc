from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import date, datetime
import calendar

class AnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        
    async def get_monthly_trends(self, start_date: Optional[date], end_date: Optional[date], org_name: str) -> List[Dict[str, Any]]:
        """Get monthly case trends"""
        collection_name = self._get_collection_name(org_name, "detail")
        collection = self.db[collection_name]
        
        match_conditions = {}
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            match_conditions["date"] = date_filter
        
        pipeline = [
            {"$match": match_conditions},
            {"$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"}
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]
        
        results = []
        async for doc in collection.aggregate(pipeline):
            month_name = calendar.month_name[doc["_id"]["month"]]
            results.append({
                "month": f"{doc['_id']['year']}-{doc['_id']['month']:02d}",
                "month_name": f"{month_name} {doc['_id']['year']}",
                "count": doc["count"]
            })
        
        return results
    
    async def get_penalty_distribution(self, start_date: Optional[date], end_date: Optional[date], org_name: str) -> List[Dict[str, Any]]:
        """Get penalty amount distribution"""
        collection_name = self._get_collection_name(org_name, "analysis")
        collection = self.db[collection_name]
        
        match_conditions = {"amount": {"$gt": 0}}
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            match_conditions["date"] = date_filter
        
        pipeline = [
            {"$match": match_conditions},
            {"$bucket": {
                "groupBy": "$amount",
                "boundaries": [0, 10000, 50000, 100000, 500000, 1000000, float('inf')],
                "default": "Other",
                "output": {
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": "$amount"}
                }
            }}
        ]
        
        results = []
        bucket_labels = {
            0: "0-1万",
            10000: "1-5万", 
            50000: "5-10万",
            100000: "10-50万",
            500000: "50-100万",
            1000000: "100万以上"
        }
        
        async for doc in collection.aggregate(pipeline):
            label = bucket_labels.get(doc["_id"], "其他")
            results.append({
                "range": label,
                "count": doc["count"],
                "total_amount": doc["total_amount"]
            })
        
        return results
    
    async def get_regional_analysis(self, start_date: Optional[date], end_date: Optional[date]) -> List[Dict[str, Any]]:
        """Get regional penalty analysis"""
        results = []
        
        # Aggregate across all collections
        for org_suffix in ["jiguan", "benji", "fenju", ""]:
            collection_name = f"cbircsplit{org_suffix}"
            collection = self.db[collection_name]
            
            match_conditions = {}
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter["$gte"] = start_date
                if end_date:
                    date_filter["$lte"] = end_date
                match_conditions["date"] = date_filter
            
            pipeline = [
                {"$match": match_conditions},
                {"$group": {
                    "_id": "$province",
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": "$amount"},
                    "avg_amount": {"$avg": "$amount"}
                }},
                {"$sort": {"count": -1}}
            ]
            
            async for doc in collection.aggregate(pipeline):
                if doc["_id"]:  # Skip empty provinces
                    existing = next((r for r in results if r["province"] == doc["_id"]), None)
                    if existing:
                        existing["count"] += doc["count"]
                        existing["total_amount"] += doc["total_amount"]
                    else:
                        results.append({
                            "province": doc["_id"],
                            "count": doc["count"],
                            "total_amount": doc["total_amount"],
                            "avg_amount": doc["avg_amount"]
                        })
        
        # Sort by count descending
        results.sort(key=lambda x: x["count"], reverse=True)
        return results
    
    async def get_industry_breakdown(self, start_date: Optional[date], end_date: Optional[date]) -> List[Dict[str, Any]]:
        """Get industry breakdown analysis"""
        results = []
        
        # Aggregate across all collections
        for org_suffix in ["jiguan", "benji", "fenju", ""]:
            collection_name = f"cbircsplit{org_suffix}"
            collection = self.db[collection_name]
            
            match_conditions = {}
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter["$gte"] = start_date
                if end_date:
                    date_filter["$lte"] = end_date
                match_conditions["date"] = date_filter
            
            pipeline = [
                {"$match": match_conditions},
                {"$group": {
                    "_id": "$industry",
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": "$amount"},
                    "avg_amount": {"$avg": "$amount"}
                }},
                {"$sort": {"count": -1}}
            ]
            
            async for doc in collection.aggregate(pipeline):
                if doc["_id"]:  # Skip empty industries
                    existing = next((r for r in results if r["industry"] == doc["_id"]), None)
                    if existing:
                        existing["count"] += doc["count"]
                        existing["total_amount"] += doc["total_amount"]
                    else:
                        results.append({
                            "industry": doc["_id"],
                            "count": doc["count"],
                            "total_amount": doc["total_amount"],
                            "avg_amount": doc["avg_amount"]
                        })
        
        # Sort by count descending
        results.sort(key=lambda x: x["count"], reverse=True)
        return results
    
    def _get_collection_name(self, org_name: str, collection_type: str) -> str:
        """Get collection name based on org name and type"""
        org_mapping = {
            "银保监会机关": "jiguan",
            "银保监局本级": "benji", 
            "银保监分局本级": "fenju",
            "": ""
        }
        
        type_mapping = {
            "summary": "cbircsum",
            "detail": "cbircdtl",
            "analysis": "cbircsplit"
        }
        
        org_suffix = org_mapping.get(org_name, "")
        type_prefix = type_mapping.get(collection_type, "cbircdtl")
        
        return f"{type_prefix}{org_suffix}"