import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, datetime
import os
import glob
import re
from app.core.database import db_manager
from app.core.config import settings
from app.models.case import (
    CaseDetail, CaseSummary, CaseSearchRequest, CaseSearchResponse,
    CaseStats, MonthlyTrend, RegionalStats, OrganizationType
)


class CaseService:
    def __init__(self):
        self.org_mapping = {
            "银保监会机关": "jiguan",
            "银保监局本级": "benji", 
            "银保监分局本级": "fenju",
            "": ""
        }
        # Use DB flag and local data folder from settings
        self.use_db: bool = not settings.DISABLE_DATABASE
        self.local_data_folder = settings.DATA_FOLDER or "cbirc"

    def _load_local_csvs(self, prefix: str) -> pd.DataFrame:
        """Load and concatenate local CSV files matching prefix from cbirc/"""
        try:
            pattern = os.path.join(self.local_data_folder, f"{prefix}*.csv")
            files = sorted(glob.glob(pattern))
            if not files:
                return pd.DataFrame()
            dataframes = []
            for file_path in files:
                try:
                    df = pd.read_csv(file_path)
                    dataframes.append(df)
                except Exception as read_err:
                    print(f"Failed to read {file_path}: {read_err}")
            if not dataframes:
                return pd.DataFrame()
            combined = pd.concat(dataframes, ignore_index=True)
            return combined
        except Exception as e:
            print(f"Local CSV load error for prefix {prefix}: {e}")
            return pd.DataFrame()
        
    def _split_words(self, text: str) -> str:
        """Split string by space into words, add regex patterns"""
        if not text:
            return ""
        words = text.split()
        words = ["(?=.*" + word + ")" for word in words]
        return "".join(words)
    
    async def get_case_summary(self, org_name: str = "") -> pd.DataFrame:
        """Get case summary data (DB or local CSV fallback)"""
        org_code = self.org_mapping.get(org_name, "")
        collection_name = f"cbircsum{org_code}"
        
        # Try DB first only if enabled
        df = pd.DataFrame()
        if self.use_db:
            try:
                df = await db_manager.get_dataframe(collection_name)
            except Exception as e:
                print(f"Error getting case summary (db): {e}")

        # Fallback to local CSVs
        if df.empty:
            # When no org specified, aggregate across all detail files
            if org_code:
                df = self._load_local_csvs(collection_name)
            else:
                candidates = [
                    self._load_local_csvs("cbircdtljiguan"),
                    self._load_local_csvs("cbircdtlbenji"),
                    self._load_local_csvs("cbircdtlfenju"),
                    self._load_local_csvs("cbircdtl"),
                ]
                non_empty = [d for d in candidates if not d.empty]
                df = pd.concat(non_empty, ignore_index=True) if non_empty else pd.DataFrame()
        
        if not df.empty and "publishDate" in df.columns:
            df["发布日期"] = pd.to_datetime(df["publishDate"]).dt.date
        return df
    
    async def get_case_detail(self, org_name: str = "") -> pd.DataFrame:
        """Get case detail data (DB or local CSV fallback)"""
        org_code = self.org_mapping.get(org_name, "")
        collection_name = f"cbircdtl{org_code}"
        
        # Try DB first only if enabled
        df = pd.DataFrame()
        if self.use_db:
            try:
                df = await db_manager.get_dataframe(collection_name)
            except Exception as e:
                print(f"Error getting case detail (db): {e}")

        # Fallback to local CSVs
        if df.empty:
            if org_code:
                df = self._load_local_csvs(collection_name)
            else:
                # Aggregate across all known detail prefixes when no org specified
                candidates = [
                    self._load_local_csvs("cbircdtljiguan"),
                    self._load_local_csvs("cbircdtlbenji"),
                    self._load_local_csvs("cbircdtlfenju"),
                    self._load_local_csvs("cbircdtl"),
                ]
                non_empty = [d for d in candidates if not d.empty]
                df = pd.concat(non_empty, ignore_index=True) if non_empty else pd.DataFrame()
        
        if df.empty:
            return pd.DataFrame()
        
        # Check required columns
        required_columns = ["title", "subtitle", "date", "doc", "id"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"Missing columns: {missing_columns}")
            return pd.DataFrame()
        
        # Process data
        result_df = df[required_columns].copy()
        # Robust date parsing
        result_df["date"] = pd.to_datetime(result_df["date"], errors='coerce').dt.date
        result_df.columns = ["标题", "文号", "发布日期", "内容", "id"]
        
        return result_df
    
    async def get_case_analysis(self, org_name: str = "") -> pd.DataFrame:
        """Get case analysis data (DB or local CSV fallback)"""
        org_code = self.org_mapping.get(org_name, "")
        collection_name = f"cbircsplit{org_code}"
        
        # Try DB first only if enabled
        df = pd.DataFrame()
        if self.use_db:
            try:
                df = await db_manager.get_dataframe(collection_name)
            except Exception as e:
                print(f"Error getting case analysis (db): {e}")

        if df.empty:
            if org_code:
                df = self._load_local_csvs(collection_name)
            else:
                candidates = [
                    self._load_local_csvs("cbircsplitjiguan"),
                    self._load_local_csvs("cbircsplitbenji"),
                    self._load_local_csvs("cbircsplitfenju"),
                    self._load_local_csvs("cbircsplit"),
                ]
                non_empty = [d for d in candidates if not d.empty]
                df = pd.concat(non_empty, ignore_index=True) if non_empty else pd.DataFrame()
        return df
    
    async def get_case_categories(self) -> pd.DataFrame:
        """Get case categories data (DB or local CSV fallback)"""
        # Try DB first only if enabled
        df = pd.DataFrame()
        if self.use_db:
            try:
                df = await db_manager.get_dataframe("cbirccat")
            except Exception as e:
                print(f"Error getting case categories (db): {e}")

        if df.empty:
            df = self._load_local_csvs("cbirccat")
            if not df.empty and "id" in df.columns:
                df = df.drop_duplicates(subset=["id"], keep="last").reset_index(drop=True)
        return df
    
    async def search_cases(self, search_request: CaseSearchRequest) -> CaseSearchResponse:
        """Search cases based on criteria"""
        try:
            # Determine org scope
            org_name = getattr(search_request, "org_name", "") or ""

            # Get combined data (optionally scoped by organization)
            detail_df = await self.get_case_detail(org_name)
            # Fallback: if scoped read is empty, try full dataset
            if detail_df.empty and org_name:
                detail_df = await self.get_case_detail("")
            analysis_df = await self.get_case_analysis(org_name)
            category_df = await self.get_case_categories()
            
            if detail_df.empty:
                return CaseSearchResponse(
                    cases=[], total=0, page=search_request.page,
                    page_size=search_request.page_size, total_pages=0
                )
            
            # Merge dataframes
            merged_df = detail_df.copy()
            if not analysis_df.empty:
                merged_df = pd.merge(merged_df, analysis_df, on="id", how="left")
            if not category_df.empty:
                merged_df = pd.merge(merged_df, category_df, on="id", how="left")
            
            # Apply search filters
            filtered_df = self._apply_search_filters(merged_df, search_request)
            
            # Pagination - use unique IDs only
            total = filtered_df["id"].nunique() if "id" in filtered_df.columns else len(filtered_df)
            total_pages = (total + search_request.page_size - 1) // search_request.page_size
            start_idx = (search_request.page - 1) * search_request.page_size
            end_idx = start_idx + search_request.page_size
            
            paginated_df = filtered_df.iloc[start_idx:end_idx]
            
            # Convert to response format
            cases = []
            for _, row in paginated_df.iterrows():
                case = CaseDetail(
                    id=str(row.get("id", "")),
                    title=str(row.get("标题", "")),
                    subtitle=str(row.get("文号", "")),
                    publish_date=row.get("发布日期", date.today()),
                    content=str(row.get("内容", "")),
                    summary=str(row.get("summary", "")),
                    wenhao=str(row.get("wenhao", "")),
                    people=str(row.get("people", "")),
                    event=str(row.get("event", "")),
                    law=str(row.get("law", "")),
                    penalty=str(row.get("penalty", "")),
                    org=str(row.get("org", "")),
                    penalty_date=row.get("penalty_date"),
                    category=str(row.get("category", "")),
                    amount=float(row.get("amount", 0)) if pd.notna(row.get("amount")) else 0,
                    province=str(row.get("province", "")),
                    industry=row.get("industry")
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
            print(f"Error searching cases: {e}")
            return CaseSearchResponse(
                cases=[], total=0, page=search_request.page,
                page_size=search_request.page_size, total_pages=0
            )
    
    def _apply_search_filters(self, df: pd.DataFrame, search_request: CaseSearchRequest) -> pd.DataFrame:
        """Apply search filters to dataframe"""
        filtered_df = df.copy()
        
        # Date range filter
        if search_request.start_date:
            filtered_df = filtered_df[filtered_df["发布日期"] >= search_request.start_date]
        if search_request.end_date:
            filtered_df = filtered_df[filtered_df["发布日期"] <= search_request.end_date]
        
        # Text filters
        text_filters = [
            ("wenhao", search_request.wenhao_text),
            ("people", search_request.people_text),
            ("event", search_request.event_text),
            ("law", search_request.law_text),
            ("penalty", search_request.penalty_text),
            ("org", search_request.org_text),
            ("industry", search_request.industry),
            ("province", search_request.province),
        ]
        
        for column, text in text_filters:
            if text and column in filtered_df.columns:
                pattern = self._split_words(text)
                if pattern:
                    filtered_df = filtered_df[
                        filtered_df[column].astype(str).str.contains(pattern, case=False, na=False, regex=True)
                    ]

        # Title filter (from app.py 案情经过)
        if getattr(search_request, "title_text", "") and "标题" in filtered_df.columns:
            title_pattern = self._split_words(search_request.title_text)
            if title_pattern:
                filtered_df = filtered_df[
                    filtered_df["标题"].astype(str).str.contains(title_pattern, case=False, na=False, regex=True)
                ]
        
        # Amount filter
        if search_request.min_penalty and "amount" in filtered_df.columns:
            filtered_df = filtered_df[
                pd.to_numeric(filtered_df["amount"], errors='coerce').fillna(0) >= search_request.min_penalty
            ]

        # General keyword filter across multiple fields
        if getattr(search_request, "keyword", ""):
            keyword_pattern = self._split_words(search_request.keyword)
            if keyword_pattern:
                candidate_columns = [
                    "标题", "文号", "内容", "wenhao", "people", "event",
                    "law", "penalty", "org", "province", "industry", "category"
                ]
                existing_columns = [c for c in candidate_columns if c in filtered_df.columns]
                if existing_columns:
                    mask = pd.Series(False, index=filtered_df.index)
                    for col in existing_columns:
                        mask = mask | filtered_df[col].astype(str).str.contains(keyword_pattern, case=False, na=False, regex=True)
                    filtered_df = filtered_df[mask]
        
        # Sort by date descending (fallback to id when date not available)
        if "发布日期" in filtered_df.columns and filtered_df["发布日期"].notna().any():
            filtered_df = filtered_df.sort_values(["发布日期", "id"], ascending=[False, False])
        elif "id" in filtered_df.columns:
            filtered_df = filtered_df.sort_values("id", ascending=False)
        
        # Remove duplicates
        if "id" in filtered_df.columns:
            filtered_df = filtered_df.drop_duplicates(subset=["id"])
        
        return filtered_df.reset_index(drop=True)
    
    async def get_case_stats(self) -> CaseStats:
        """Get overall case statistics"""
        try:
            detail_df = await self.get_case_detail("")
            category_df = await self.get_case_categories()
            
            if detail_df.empty:
                return CaseStats(
                    total_cases=0, total_amount=0, avg_amount=0,
                    date_range={}, by_province={}, by_industry={}, by_month={}
                )
            
            # Merge with category data
            if not category_df.empty:
                merged_df = pd.merge(detail_df, category_df, on="id", how="left")
            else:
                merged_df = detail_df.copy()
            
            # Calculate stats - use unique IDs only
            total_cases = merged_df["id"].nunique() if "id" in merged_df.columns else len(merged_df)
            
            # Amount statistics
            amount_col = merged_df.get("amount", pd.Series(dtype=float))
            valid_amounts = pd.to_numeric(amount_col, errors='coerce').dropna()
            total_amount = valid_amounts.sum() if not valid_amounts.empty else 0
            avg_amount = valid_amounts.mean() if not valid_amounts.empty else 0
            
            # Date range
            date_range = {}
            if "发布日期" in merged_df.columns and not merged_df["发布日期"].empty:
                min_date = merged_df["发布日期"].min()
                max_date = merged_df["发布日期"].max()
                date_range = {"start": str(min_date), "end": str(max_date)}
            
            # Province statistics
            by_province = {}
            if "province" in merged_df.columns:
                province_counts = merged_df["province"].value_counts()
                by_province = province_counts.to_dict()
            
            # Industry statistics
            by_industry = {}
            if "industry" in merged_df.columns:
                industry_counts = merged_df["industry"].value_counts()
                by_industry = industry_counts.to_dict()
            
            # Monthly statistics
            by_month = {}
            if "发布日期" in merged_df.columns:
                merged_df["month"] = merged_df["发布日期"].apply(
                    lambda x: x.strftime("%Y-%m") if pd.notna(x) else ""
                )
                month_counts = merged_df["month"].value_counts()
                by_month = month_counts.to_dict()
            
            return CaseStats(
                total_cases=total_cases,
                total_amount=float(total_amount),
                avg_amount=float(avg_amount),
                date_range=date_range,
                by_province=by_province,
                by_industry=by_industry,
                by_month=by_month
            )
            
        except Exception as e:
            print(f"Error getting case stats: {e}")
            return CaseStats(
                total_cases=0, total_amount=0, avg_amount=0,
                date_range={}, by_province={}, by_industry={}, by_month={}
            )
    
    async def get_monthly_trends(self) -> List[MonthlyTrend]:
        """Get monthly trend data"""
        try:
            detail_df = await self.get_case_detail("")
            category_df = await self.get_case_categories()
            
            if detail_df.empty:
                return []
            
            # Merge with category data for amounts
            if not category_df.empty:
                merged_df = pd.merge(detail_df, category_df, on="id", how="left")
            else:
                merged_df = detail_df.copy()
            
            # Group by month
            merged_df["month"] = merged_df["发布日期"].apply(
                lambda x: x.strftime("%Y-%m") if pd.notna(x) else ""
            )
            
            monthly_stats = merged_df.groupby("month").agg({
                "id": "count",
                "amount": lambda x: pd.to_numeric(x, errors='coerce').sum()
            }).reset_index()
            
            trends = []
            for _, row in monthly_stats.iterrows():
                if row["month"]:  # Skip empty months
                    trends.append(MonthlyTrend(
                        month=row["month"],
                        count=int(row["id"]),
                        amount=float(row["amount"]) if pd.notna(row["amount"]) else 0
                    ))
            
            return sorted(trends, key=lambda x: x.month)
            
        except Exception as e:
            print(f"Error getting monthly trends: {e}")
            return []
    
    async def get_regional_stats(self) -> List[RegionalStats]:
        """Get regional statistics"""
        try:
            detail_df = await self.get_case_detail("")
            category_df = await self.get_case_categories()
            
            if detail_df.empty:
                return []
            
            # Merge with category data
            if not category_df.empty:
                merged_df = pd.merge(detail_df, category_df, on="id", how="left")
            else:
                merged_df = detail_df.copy()
            
            if "province" not in merged_df.columns:
                return []
            
            # Group by province
            regional_stats = merged_df.groupby("province").agg({
                "id": "count",
                "amount": [lambda x: pd.to_numeric(x, errors='coerce').sum(),
                          lambda x: pd.to_numeric(x, errors='coerce').mean()]
            }).reset_index()
            
            # Flatten column names
            regional_stats.columns = ["province", "count", "total_amount", "avg_amount"]
            
            stats = []
            for _, row in regional_stats.iterrows():
                if row["province"]:  # Skip empty provinces
                    stats.append(RegionalStats(
                        province=row["province"],
                        count=int(row["count"]),
                        amount=float(row["total_amount"]) if pd.notna(row["total_amount"]) else 0,
                        avg_amount=float(row["avg_amount"]) if pd.notna(row["avg_amount"]) else 0
                    ))
            
            return sorted(stats, key=lambda x: x.count, reverse=True)
            
        except Exception as e:
            print(f"Error getting regional stats: {e}")
            return []


# Global service instance
case_service = CaseService()