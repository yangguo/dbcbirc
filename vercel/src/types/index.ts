export interface CaseSearchRequest {
  // Pagination
  page?: number
  page_size?: number

  // 作出处罚决定的机关名称
  org_name?: string

  // Date filters - 发布日期
  start_date?: string
  end_date?: string
  date_start?: string
  date_end?: string

  // Text filters - MongoDB字段映射
  title_text?: string        // 标题
  wenhao_text?: string       // 行政处罚决定书文号
  people_text?: string       // 被处罚当事人
  event_text?: string        // 主要违法违规事实
  law_text?: string          // 行政处罚依据
  penalty_text?: string      // 行政处罚决定

  // Other filters
  industry?: string          // 行业
  province?: string          // 省份
  min_penalty?: number       // 金额 (最小值)

  // General keyword
  keyword?: string

  // For backward compatibility
  penalty_type?: string

  [key: string]: any
}

export interface CaseDetail {
  _id?: string
  发布日期?: string
  标题: string
  副标题?: string
  内容?: string
  行政处罚决定书文号?: string
  被处罚当事人?: string
  主要违法违规事实?: string
  行政处罚依据?: string
  行政处罚决定?: string
  作出处罚决定的机关名称?: string
  作出处罚决定的日期?: string
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