"use client"

import { useState } from "react"
import { SearchForm } from "@/components/search-form"
import { SearchResults } from "@/components/search-results"
import { ThemeToggle } from "@/components/theme-toggle"
import { CaseSearchRequest, CaseSearchResponse } from "@/types"

export default function HomePage() {
  const [searchResults, setSearchResults] = useState<CaseSearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentSearchParams, setCurrentSearchParams] = useState<CaseSearchRequest | null>(null)

  const handleSearch = async (params: CaseSearchRequest) => {
    setIsLoading(true)
    setCurrentSearchParams(params)
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })
      
      if (!response.ok) {
        throw new Error('搜索失败')
      }
      
      const data: CaseSearchResponse = await response.json()
      
      if (params.page === 1) {
        setSearchResults(data)
      } else {
        // 加载更多时，合并结果
        setSearchResults(prev => prev ? {
          ...data,
          cases: [...prev.cases, ...data.cases]
        } : data)
      }
    } catch (error) {
      console.error('搜索错误:', error)
      alert('搜索失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (currentSearchParams && searchResults) {
      const nextPage = searchResults.page + 1
      handleSearch({
        ...currentSearchParams,
        page: nextPage
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                在线案例搜索系统
              </h1>
              <p className="text-muted-foreground">
                搜索和浏览监管案例数据库
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
        
        <div className="space-y-8">
          <SearchForm 
            onSearch={handleSearch} 
            isLoading={isLoading}
          />
          
          <SearchResults 
            results={searchResults}
            isLoading={isLoading}
            onLoadMore={handleLoadMore}
          />
        </div>
      </div>
    </div>
  )
}