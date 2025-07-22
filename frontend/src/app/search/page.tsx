'use client'

import React, { useState } from 'react'
import { SearchForm } from '@/components/search/search-form'
import { SearchResults } from '@/components/search/search-results'
import { CaseSearchRequest } from '@/lib/api'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">案例搜索</h1>
        <p className="text-muted-foreground">
          搜索和筛选监管处罚案例
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SearchForm onSearch={handleSearch} />
        </div>
        <div className="lg:col-span-2">
          <SearchResults 
            searchParams={searchParams}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  )
}