from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from enum import Enum


class OrganizationType(str, Enum):
    HEADQUARTERS = "银保监会机关"
    PROVINCIAL = "银保监局本级"
    LOCAL = "银保监分局本级"


class IndustryType(str, Enum):
    BANKING = "银行"
    INSURANCE = "保险"
    MIXED = "混合"


class CaseBase(BaseModel):
    title: str = Field(..., description="案例标题")
    subtitle: str = Field(..., description="文号")
    publish_date: date = Field(..., description="发布日期")
    content: str = Field(..., description="案例内容")
    

class CaseDetail(CaseBase):
    id: str = Field(..., description="案例ID")
    summary: Optional[str] = Field(None, description="案例摘要")
    wenhao: Optional[str] = Field(None, description="行政处罚决定书文号")
    people: Optional[str] = Field(None, description="被处罚当事人")
    event: Optional[str] = Field(None, description="主要违法违规事实")
    law: Optional[str] = Field(None, description="行政处罚依据")
    penalty: Optional[str] = Field(None, description="行政处罚决定")
    org: Optional[str] = Field(None, description="作出处罚决定的机关名称")
    penalty_date: Optional[date] = Field(None, description="作出处罚决定的日期")
    category: Optional[str] = Field(None, description="案件类型")
    amount: Optional[float] = Field(None, description="罚款金额")
    province: Optional[str] = Field(None, description="处罚地区")
    industry: Optional[IndustryType] = Field(None, description="行业类型")


class CaseSummary(BaseModel):
    id: str
    title: str
    subtitle: str
    publish_date: date
    url: Optional[str] = None


class CaseSearchRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    wenhao_text: Optional[str] = ""
    people_text: Optional[str] = ""
    event_text: Optional[str] = ""
    law_text: Optional[str] = ""
    penalty_text: Optional[str] = ""
    org_text: Optional[str] = ""
    industry: Optional[str] = ""
    min_penalty: Optional[float] = 0
    province: Optional[str] = ""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class CaseSearchResponse(BaseModel):
    cases: List[CaseDetail]
    total: int
    page: int
    page_size: int
    total_pages: int


class CaseStats(BaseModel):
    total_cases: int
    total_amount: float
    avg_amount: float
    date_range: Dict[str, str]
    by_province: Dict[str, int]
    by_industry: Dict[str, int]
    by_month: Dict[str, int]


class MonthlyTrend(BaseModel):
    month: str
    count: int
    amount: float


class RegionalStats(BaseModel):
    province: str
    count: int
    amount: float
    avg_amount: float


class UpdateRequest(BaseModel):
    org_name: OrganizationType
    start_page: int = Field(default=1, ge=1)
    end_page: int = Field(default=1, ge=1)