from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.case import CaseSearchRequest, CaseSearchResponse, CaseAnalysis
import re
from datetime import datetime

class SearchService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        
    async def search_cases(self, search_request: CaseSearchRequest) -> CaseSearchResponse:
        """Search cases with filters"""
        # Build aggregation pipeline
        pipeline = []
        
        # Match stage
        match_conditions = {}
        
        # Date range filter
        if search_request.start_date or search_request.end_date:
            date_filter = {}
            if search_request.start_date:
                date_filter["$gte"] = search_request.start_date
            if search_request.end_date:
                date_filter["$lte"] = search_request.end_date
            match_conditions["date"] = date_filter
        
        # Text search filters
        text_filters = [
            ("wenhao", search_request.wenhao_text),
            ("people", search_request.people_text),
            ("event", search_request.event_text),
            ("law", search_request.law_text),
            ("penalty", search_request.penalty_text),
            ("org", search_request.org_text),
            ("industry", search_request.industry),
            ("province", search_request.province)
        ]
        
        for field, text in text_filters:
            if text:
                # Split words and create regex pattern
                words = text.split()
                if words:
                    patterns = [f"(?=.*{re.escape(word)})" for word in words]
                    regex_pattern = "".join(patterns)
                    match_conditions[field] = {"$regex": regex_pattern, "$options": "i"}
        
        # Penalty amount filter
        if search_request.min_penalty > 0:
            match_conditions["amount"] = {"$gte": search_request.min_penalty}
        
        if match_conditions:
            pipeline.append({"$match": match_conditions})
        
        # Sort by date descending
        pipeline.append({"$sort": {"date": -1}})
        
        # Get total count
        count_pipeline = pipeline + [{"$count": "total"}]
        
        # Add pagination
        skip = (search_request.page - 1) * search_request.page_size
        pipeline.extend([
            {"$skip": skip},
            {"$limit": search_request.page_size}
        ])
        
        # Execute search across all analysis collections
        all_cases = []
        total_count = 0
        
        for org_suffix in ["jiguan", "benji", "fenju", ""]:
            collection_name = f"cbircsplit{org_suffix}"
            collection = self.db[collection_name]
            
            # Get count
            count_result = await collection.aggregate(count_pipeline).to_list(1)
            if count_result:
                total_count += count_result[0]["total"]
            
            # Get cases
            async for doc in collection.aggregate(pipeline):
                case = CaseAnalysis(
                    id=doc.get("id", ""),
                    summary=doc.get("summary", ""),
                    wenhao=doc.get("wenhao", ""),
                    people=doc.get("people", ""),
                    event=doc.get("event", ""),
                    law=doc.get("law", ""),
                    penalty=doc.get("penalty", ""),
                    org=doc.get("org", ""),
                    category=doc.get("category", ""),
                    amount=doc.get("amount", 0.0),
                    province=doc.get("province", ""),
                    industry=doc.get("industry", "")
                )
                all_cases.append(case)
        
        # Sort all cases by date and apply pagination
        all_cases.sort(key=lambda x: x.id, reverse=True)  # Assuming ID contains date info
        
        total_pages = (total_count + search_request.page_size - 1) // search_request.page_size
        
        return CaseSearchResponse(
            cases=all_cases,
            total=total_count,
            page=search_request.page,
            page_size=search_request.page_size,
            total_pages=total_pages
        )
    
    async def get_suggestions(self, field: str, query: str, limit: int) -> List[str]:
        """Get search suggestions for autocomplete"""
        suggestions = []
        
        # Search across all collections
        for org_suffix in ["jiguan", "benji", "fenju", ""]:
            collection_name = f"cbircsplit{org_suffix}"
            collection = self.db[collection_name]
            
            if query:
                pipeline = [
                    {"$match": {field: {"$regex": f"^{re.escape(query)}", "$options": "i"}}},
                    {"$group": {"_id": f"${field}"}},
                    {"$limit": limit}
                ]
            else:
                pipeline = [
                    {"$group": {"_id": f"${field}"}},
                    {"$limit": limit}
                ]
            
            async for doc in collection.aggregate(pipeline):
                if doc["_id"] and doc["_id"] not in suggestions:
                    suggestions.append(doc["_id"])
                    
                if len(suggestions) >= limit:
                    break
        
        return suggestions[:limit]