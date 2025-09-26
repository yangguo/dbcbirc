import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    // Get MongoDB collection
    const collection = await getCollection(process.env.MONGODB_COLLECTION || 'cases')
    
    // Get first 3 documents to examine structure
    const sampleDocs = await collection.find({}).limit(3).toArray()
    
    // Get total count
    const totalCount = await collection.countDocuments({})
    
    // Get distinct values for key fields
    const [distinctCategories, distinctProvinces, distinctIndustries] = await Promise.all([
      collection.distinct('category'),
      collection.distinct('province'), 
      collection.distinct('industry')
    ])
    
    const [distinctCategories_zh, distinctProvinces_zh, distinctIndustries_zh] = await Promise.all([
      collection.distinct('分类'),
      collection.distinct('省份'),
      collection.distinct('行业')
    ])
    
    return NextResponse.json({
      totalDocuments: totalCount,
      sampleDocuments: sampleDocs,
      distinctValues: {
        categories: distinctCategories,
        provinces: distinctProvinces,
        industries: distinctIndustries,
        categories_zh: distinctCategories_zh,
        provinces_zh: distinctProvinces_zh,
        industries_zh: distinctIndustries_zh
      },
      mongoConfig: {
        collection: process.env.MONGODB_COLLECTION || 'cases',
        database: process.env.MONGODB_DB || 'cbirc'
      }
    })
    
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { 
        error: 'Database connection error',
        message: error instanceof Error ? error.message : 'Unknown error',
        mongoConfig: {
          collection: process.env.MONGODB_COLLECTION || 'cases',
          database: process.env.MONGODB_DB || 'cbirc'
        }
      },
      { status: 500 }
    )
  }
}