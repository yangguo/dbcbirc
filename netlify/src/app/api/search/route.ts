import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb'
import { CaseSearchRequest, CaseSearchResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const searchParams: CaseSearchRequest = await request.json()
    
    // Get MongoDB collection
    const collection = await getCollection(process.env.MONGODB_COLLECTION || 'cases')
    
    // Build MongoDB query
    const query: any = {}
    
    // Date range filter - support multiple date fields and formats
    if (searchParams.start_date || searchParams.end_date) {
      const dateConditions: any[] = []
      
      // Create date filters for both Date objects and string formats
      const createDateFilter = (startDateStr?: string, endDateStr?: string) => {
        const filter: any = {}
        
        if (startDateStr) {
          const startDate = new Date(startDateStr)
          filter.$gte = startDate
        }
        
        if (endDateStr) {
          const endDate = new Date(endDateStr)
          endDate.setHours(23, 59, 59, 999)
          filter.$lte = endDate
        }
        
        return filter
      }
      
      const createStringDateFilter = (startDateStr?: string, endDateStr?: string) => {
        const filter: any = {}
        
        if (startDateStr) {
          filter.$gte = startDateStr
        }
        
        if (endDateStr) {
          filter.$lte = endDateStr
        }
        
        return filter
      }
      
      const dateFilter = createDateFilter(searchParams.start_date, searchParams.end_date)
      const stringDateFilter = createStringDateFilter(searchParams.start_date, searchParams.end_date)
      
      // Search only in publish date fields with both Date and string formats
      const dateFieldQueries = [
        { '发布日期': dateFilter },
        { '发布日期': stringDateFilter }
      ]
      
      const dateQuery = { $or: dateFieldQueries }
      
      // If there's already an $or query (from keyword search), combine them
      if (query.$or && query.$or.length > 0) {
        query.$and = [
          { $or: query.$or },
          dateQuery
        ]
        delete query.$or
      } else {
        query.$or = dateQuery.$or
      }
    }
    
    // Text search filters (single-field)
    const textFilters = [
      { field: '行政处罚决定书文号', param: searchParams.wenhao_text },
      { field: '被处罚当事人', param: searchParams.people_text },
      { field: '主要违法违规事实', param: searchParams.event_text },
      { field: '行政处罚依据', param: searchParams.law_text },
      { field: '行政处罚决定', param: searchParams.penalty_text },
      { field: '标题', param: searchParams.title_text },
    ]

    // Accumulate AND conditions for flexible combinations
    const andConditions: any[] = []

    textFilters.forEach(({ field, param }) => {
      if (param) {
        const words = param.split(/\s+/).filter(word => word.length > 0)
        if (words.length > 0) {
          const regexPatterns = words.map(word => new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
          if (regexPatterns.length === 1) {
            andConditions.push({ [field]: regexPatterns[0] })
          } else {
            andConditions.push({ [field]: { $all: regexPatterns } })
          }
        }
      }
    })

    // Multi-field synonyms: industry/行业, province/省份, category/分类
    const addSynonymCondition = (cnField: string, enField: string, value?: string) => {
      if (!value) return
      const words = value.split(/\s+/).filter(w => w.length > 0)
      if (words.length === 0) return
      const regexPatterns = words.map(word => new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
      if (regexPatterns.length === 1) {
        andConditions.push({ $or: [ { [cnField]: regexPatterns[0] }, { [enField]: regexPatterns[0] } ] })
      } else {
        andConditions.push({ $or: [ { [cnField]: { $all: regexPatterns } }, { [enField]: { $all: regexPatterns } } ] })
      }
    }

    addSynonymCondition('行业', 'industry', searchParams.industry)
    addSynonymCondition('省份', 'province', searchParams.province)
    addSynonymCondition('分类', 'category', searchParams.category)
    
    // Organization name filter
    if (searchParams.org_name) {
      andConditions.push({ '作出处罚决定的机关名称': new RegExp(searchParams.org_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
    }
    
    // Minimum penalty filter
    if (searchParams.min_penalty && searchParams.min_penalty > 0) {
      andConditions.push({ $or: [ { '金额': { $gte: searchParams.min_penalty } }, { 'amount': { $gte: searchParams.min_penalty } } ] })
    }
    
    // General keyword search
    if (searchParams.keyword) {
      const keywordRegex = new RegExp(searchParams.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const keywordQuery = {
        $or: [
          { '标题': keywordRegex },
          { '文号': keywordRegex },
          { '行政处罚决定书文号': keywordRegex },
          { '被处罚当事人': keywordRegex },
          { '主要违法违规事实': keywordRegex },
          { '行政处罚依据': keywordRegex },
          { '行政处罚决定': keywordRegex },
          { '作出处罚决定的机关名称': keywordRegex },
          // Include English synonyms so keyword can match enriched fields
          { 'industry': keywordRegex },
          { 'province': keywordRegex },
          { 'category': keywordRegex }
        ]
      }
      andConditions.push(keywordQuery)
    }

    // Merge date filter into AND conditions if present
    if (query.$or || query.$and) {
      if (query.$and) {
        andConditions.push(...query.$and)
      } else if (query.$or) {
        andConditions.push({ $or: query.$or })
      }
      // Reset base query; we'll rebuild from andConditions
      delete query.$or
      delete query.$and
    }

    // Finalize query
    if (andConditions.length > 0) {
      query.$and = andConditions
    }
    
    // Pagination
    const page = searchParams.page || 1
    const pageSize = searchParams.page_size || 20
    const skip = (page - 1) * pageSize
    
    // Execute query with pagination
    const [cases, total] = await Promise.all([
      collection.find(query)
        .sort({ '发布日期': -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      collection.countDocuments(query)
    ])
    
    // Transform MongoDB documents to match frontend interface
    const transformedCases = cases.map((doc: any) => {
      // Helper functions to extract missing fields
      const extractProvinceFromOrg = (orgName?: string) => {
        if (!orgName) return null
        const provincePatterns = [
          '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
          '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
          '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
          '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'
        ]
        for (const province of provincePatterns) {
          if (orgName.includes(province)) {
            return province === '内蒙古' ? '内蒙古自治区' : 
                   province === '广西' ? '广西壮族自治区' :
                   province === '西藏' ? '西藏自治区' :
                   province === '宁夏' ? '宁夏回族自治区' :
                   province === '新疆' ? '新疆维吾尔自治区' :
                   ['北京', '天津', '上海', '重庆'].includes(province) ? province + '市' :
                   province + '省'
          }
        }
        return null
      }

      const extractIndustryFromEntity = (entityName?: string) => {
        if (!entityName) return null
        const industryPatterns = [
          { keywords: ['银行', '农商银行', '村镇银行', '信用社'], industry: '银行' },
          { keywords: ['保险', '人寿', '财险', '平安'], industry: '保险' },
          { keywords: ['证券', '基金', '期货'], industry: '证券' },
          { keywords: ['信托'], industry: '信托' },
          { keywords: ['租赁'], industry: '租赁' },
          { keywords: ['小贷', '小额贷款'], industry: '小额贷款' }
        ]
        for (const pattern of industryPatterns) {
          if (pattern.keywords.some(keyword => entityName.includes(keyword))) {
            return pattern.industry
          }
        }
        return null
      }

      const extractAmountFromPenalty = (penaltyText?: string) => {
        if (!penaltyText) return 0
        const amountMatch = penaltyText.match(/(\d+(?:\.\d+)?)\s*万元/)
        if (amountMatch) {
          return parseFloat(amountMatch[1]) * 10000
        }
        const yuanMatch = penaltyText.match(/(\d+(?:\.\d+)?)\s*元/)
        if (yuanMatch) {
          return parseFloat(yuanMatch[1])
        }
        return 0
      }

      // Extract fields with fallbacks
      const orgName = doc['作出处罚决定的机关名称'] || doc['机构'] || doc.org
      const entityName = doc['被处罚当事人'] || doc['当事人'] || doc.people
      const penaltyDecision = doc['行政处罚决定'] || doc['处罚决定'] || doc.penalty
      const violationFact = doc['主要违法违规事实'] || doc['违法事实'] || doc.event

      const result: any = {
        // Ensure all original fields are preserved
        ...doc,
        
        // Standardize key fields for consistent access
        id: doc._id?.toString() || '',
        
        // Map Chinese keys to English keys, but keep original
        标题: doc['标题'] || doc.title,
        发布日期: doc['发布日期'] || doc.publish_date,
        行政处罚决定书文号: doc['行政处罚决定书文号'] || doc['文号'] || doc.wenhao,
        被处罚当事人: entityName,
        主要违法违规事实: violationFact,
        行政处罚依据: doc['行政处罚依据'] || doc['法律依据'] || doc.law,
        行政处罚决定: penaltyDecision,
        作出处罚决定的机关名称: orgName,
        作出处罚决定的日期: doc['作出处罚决定的日期'] || doc['处罚日期'] || doc.penalty_date,
        
        // Enhanced field extraction with smart fallbacks
        category: doc.category || doc['分类'] || violationFact,
        分类: doc['分类'] || doc.category || violationFact,
        
        amount: doc.amount || doc['金额'] || extractAmountFromPenalty(penaltyDecision),
        金额: doc['金额'] || doc.amount || extractAmountFromPenalty(penaltyDecision),
        
        province: doc.province || doc['省份'] || extractProvinceFromOrg(orgName),
        省份: doc['省份'] || doc.province || extractProvinceFromOrg(orgName),
        
        industry: doc.industry || doc['行业'] || extractIndustryFromEntity(entityName),
        行业: doc['行业'] || doc.industry || extractIndustryFromEntity(entityName),
      };

      // Remove MongoDB's _id in favor of a clean `id`
      delete result._id;

      return result;
    });
    
    const totalPages = Math.ceil(total / pageSize)
    
    const response: CaseSearchResponse = {
      cases: transformedCases,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
