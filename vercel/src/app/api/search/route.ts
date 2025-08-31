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
    
    // Date range filter
    if (searchParams.start_date || searchParams.end_date) {
      const dateFilter: any = {}
      if (searchParams.start_date) {
        dateFilter.$gte = searchParams.start_date
      }
      if (searchParams.end_date) {
        dateFilter.$lte = searchParams.end_date
      }
      query['发布日期'] = dateFilter
    }
    
    // Text search filters
    const textFilters = [
      { field: '行政处罚决定书文号', param: searchParams.wenhao_text },
      { field: '被处罚当事人', param: searchParams.people_text },
      { field: '主要违法违规事实', param: searchParams.event_text },
      { field: '行政处罚依据', param: searchParams.law_text },
      { field: '行政处罚决定', param: searchParams.penalty_text },
      { field: '作出处罚决定的机关名称', param: searchParams.org_text },
      { field: '行业', param: searchParams.industry },
      { field: '省份', param: searchParams.province },
      { field: '标题', param: searchParams.title_text },
    ]
    
    textFilters.forEach(({ field, param }) => {
      if (param) {
        // Split words and create regex pattern for each word
        const words = param.split(/\s+/).filter(word => word.length > 0)
        if (words.length > 0) {
          const regexPatterns = words.map(word => new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
          if (regexPatterns.length === 1) {
            query[field] = regexPatterns[0]
          } else {
            query[field] = { $all: regexPatterns }
          }
        }
      }
    })
    
    // Organization name filter
    if (searchParams.org_name) {
      query['作出处罚决定的机关名称'] = new RegExp(searchParams.org_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    }
    
    // Minimum penalty filter
    if (searchParams.min_penalty && searchParams.min_penalty > 0) {
      query['金额'] = { $gte: searchParams.min_penalty }
    }
    
    // General keyword search
    if (searchParams.keyword) {
      const keywordRegex = new RegExp(searchParams.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [
        { '标题': keywordRegex },
        { '文号': keywordRegex },
        { '行政处罚决定书文号': keywordRegex },
        { '被处罚当事人': keywordRegex },
        { '主要违法违规事实': keywordRegex },
        { '行政处罚依据': keywordRegex },
        { '行政处罚决定': keywordRegex },
        { '作出处罚决定的机关名称': keywordRegex }
      ]
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
    const transformedCases = cases.map((doc: any) => ({
      id: doc._id?.toString() || '',
      title: doc['标题'] || doc.title || '',
      subtitle: doc['副标题'] || doc.subtitle || '',
      publish_date: doc['发布日期'] || doc.publish_date || '',
      content: doc['内容'] || doc.content || '',
      wenhao: doc['行政处罚决定书文号'] || doc['文号'] || doc.wenhao || '',
      people: doc['被处罚当事人'] || doc['当事人'] || doc.people || '',
      event: doc['主要违法违规事实'] || doc['违法事实'] || doc.event || '',
      law: doc['行政处罚依据'] || doc['法律依据'] || doc.law || '',
      penalty: doc['行政处罚决定'] || doc['处罚决定'] || doc.penalty || '',
      org: doc['作出处罚决定的机关名称'] || doc['机构'] || doc.org || '',
      penalty_date: doc['作出处罚决定的日期'] || doc['处罚日期'] || doc.penalty_date || '',
      category: doc['分类'] || doc.category || '',
      amount: doc['金额'] || doc.amount || 0,
      province: doc['省份'] || doc.province || '',
      industry: doc['行业'] || doc.industry || ''
    }))
    
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