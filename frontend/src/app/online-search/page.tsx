'use client'

import React, { useState } from 'react'
import { SearchForm } from '@/components/search/search-form'
import { OnlineSearchResults } from '@/components/search/online-search-results'
import { CaseSearchRequest } from '@/lib/api'
import { Globe } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function OnlineSearchPage() {
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
      {/* Online Search Filter Section - Top */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gradient">在线案例搜索</h2>
          <div className="ml-auto">
            <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-600 rounded-full border border-cyan-500/30">
              MongoDB 线上数据
            </span>
          </div>
        </div>
        <SearchForm onSearch={handleSearch} />
      </div>

      {/* Online Search Results Section */}
      <div>
        <OnlineSearchResults 
          searchParams={searchParams}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  )
}