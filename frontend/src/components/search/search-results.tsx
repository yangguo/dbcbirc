'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient, CaseSearchRequest, CaseDetail, CaseSearchResponse } from '@/lib/api'
import { ChevronLeft, ChevronRight, ExternalLink, Download } from 'lucide-react'

interface SearchResultsProps {
  searchParams?: CaseSearchRequest
  onPageChange?: (page: number) => void
}

export function SearchResults({ searchParams = {}, onPageChange }: SearchResultsProps) {
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null)

  const { data: searchResults, isLoading, error } = useQuery<CaseSearchResponse>({
    queryKey: ['search-cases', searchParams],
    queryFn: () => apiClient.searchCases(searchParams),
    enabled: Object.keys(searchParams).length > 0,
  })

  const handleExport = async () => {
    try {
      const blob = await apiClient.exportCasesCSV()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cbirc_cases.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (Object.keys(searchParams).length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>请设置搜索条件开始搜索</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>搜索中...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>搜索失败，请重试</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!searchResults || searchResults.cases.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>未找到匹配的案例</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatAmount = (amount?: number) => {
    if (!amount) return '未知'
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万元`
    }
    return `${amount}元`
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>搜索结果</CardTitle>
              <CardDescription>
                共找到 {searchResults.total} 条案例
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              导出CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {searchResults.cases.map((case_) => (
              <div
                key={case_.id}
                className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => setSelectedCase(case_)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-2">{case_.title}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                      <div>文号: {case_.subtitle}</div>
                      <div>发布日期: {case_.publish_date}</div>
                      <div>处罚金额: {formatAmount(case_.amount)}</div>
                      <div>地区: {case_.province || '未知'}</div>
                    </div>
                    <div className="flex gap-2">
                      {case_.industry && (
                        <Badge variant="secondary" className="text-xs">
                          {case_.industry}
                        </Badge>
                      )}
                      {case_.category && (
                        <Badge variant="outline" className="text-xs">
                          {case_.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {searchResults.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                第 {searchResults.page} 页，共 {searchResults.total_pages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(searchResults.page - 1)}
                  disabled={searchResults.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(searchResults.page + 1)}
                  disabled={searchResults.page >= searchResults.total_pages}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Case Detail Modal */}
      {selectedCase && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>案例详情</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCase(null)}
              >
                关闭
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">基本信息</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">标题:</span> {selectedCase.title}
                  </div>
                  <div>
                    <span className="font-medium">文号:</span> {selectedCase.subtitle}
                  </div>
                  <div>
                    <span className="font-medium">发布日期:</span> {selectedCase.publish_date}
                  </div>
                  <div>
                    <span className="font-medium">处罚金额:</span> {formatAmount(selectedCase.amount)}
                  </div>
                  <div>
                    <span className="font-medium">地区:</span> {selectedCase.province || '未知'}
                  </div>
                  <div>
                    <span className="font-medium">行业:</span> {selectedCase.industry || '未知'}
                  </div>
                </div>
              </div>

              {selectedCase.summary && (
                <div>
                  <h3 className="font-semibold mb-2">案例摘要</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.summary}</p>
                </div>
              )}

              {selectedCase.event && (
                <div>
                  <h3 className="font-semibold mb-2">违法事实</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.event}</p>
                </div>
              )}

              {selectedCase.law && (
                <div>
                  <h3 className="font-semibold mb-2">处罚依据</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.law}</p>
                </div>
              )}

              {selectedCase.penalty && (
                <div>
                  <h3 className="font-semibold mb-2">处罚决定</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.penalty}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">案例链接</h3>
                <a
                  href={`https://www.cbirc.gov.cn/cn/view/pages/ItemDetail.html?docId=${selectedCase.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  查看原文
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}