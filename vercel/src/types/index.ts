export interface CaseSearchRequest {
  // Pagination
  page?: number
  page_size?: number

  // Org scope
  org_name?: string

  // Date filters (support both names)
  start_date?: string
  end_date?: string
  date_start?: string
  date_end?: string

  // Text filters
  title_text?: string
  wenhao_text?: string
  people_text?: string
  event_text?: string
  law_text?: string
  penalty_text?: string
  org_text?: string

  // Other filters
  industry?: string
  province?: string
  min_penalty?: number

  // General keyword
  keyword?: string

  // For backward compatibility
  penalty_type?: string

  [key: string]: any
}

export interface CaseDetail {
  _id?: string
  id?: string
  title: string
  subtitle?: string
  publish_date?: string
  content?: string
  summary?: string
  wenhao?: string
  people?: string
  event?: string
  law?: string
  penalty?: string
  org?: string
  penalty_date?: string
  category?: string
  amount?: number
  province?: string
  industry?: string
  发布日期?: string
  标题?: string
  副标题?: string
  内容?: string
  文号?: string
  当事人?: string
  违法事实?: string
  法律依据?: string
  处罚决定?: string
  机构?: string
  处罚日期?: string
  分类?: string
  金额?: number
  省份?: string
  行业?: string
}

export interface CaseSearchResponse {
  cases: CaseDetail[]
  total: number
  page: number
  page_size: number
  total_pages: number
}