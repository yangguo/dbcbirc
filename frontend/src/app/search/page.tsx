'use client'

import React, { useState } from 'react'
import { SearchForm } from '@/components/search/search-form'
import { SearchResults } from '@/components/search/search-results'
import { CaseSearchRequest } from '@/lib/api'
import { Filter } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useState<CaseSearchRequest>({
    page: 1,
    page_size: 20,
  })

  const handleSearch = (params: CaseSearchRequest) => {
    setSearchParams({ ...params, page: 1, page_size: 20 })
  }

  const handlePageChange = (page: number) => {
    setSearchParams({ ...searchParams, page })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Search Filter Section - Top */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
            <Filter className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gradient">搜索筛选</h2>
        </div>
        <SearchForm onSearch={handleSearch} />
      </div>

      {/* Search Results Section */}
      <div>
        <SearchResults 
          searchParams={searchParams}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  )
}