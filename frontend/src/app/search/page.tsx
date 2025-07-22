'use client'

import React, { useState } from 'react'
import { SearchForm } from '@/components/search/search-form'
import { SearchResults } from '@/components/search/search-results'
import { CaseSearchRequest } from '@/lib/api'
import { Search, Filter, Sparkles } from 'lucide-react'

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
    <div className="space-y-8 p-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Search className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">智能案例搜索</h1>
              <p className="text-lg text-white/90 flex items-center gap-2 mt-2">
                <Sparkles className="h-5 w-5" />
                AI驱动的监管处罚案例检索与分析系统
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">精准搜索</div>
              <div className="text-sm text-white/80">多维度筛选</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">实时结果</div>
              <div className="text-sm text-white/80">即时响应</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">智能推荐</div>
              <div className="text-sm text-white/80">相关案例</div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24 animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Search Interface */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="glass-effect rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                  <Filter className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gradient">搜索筛选</h2>
              </div>
              <SearchForm onSearch={handleSearch} />
            </div>
          </div>
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