'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { apiClient, CaseSearchRequest, CaseDetail, CaseSearchResponse } from '@/lib/api'
import { ChevronLeft, ChevronRight, ExternalLink, Download } from 'lucide-react'

interface OnlineSearchResultsProps {
  searchParams?: CaseSearchRequest
  onPageChange?: (page: number) => void
}

export function OnlineSearchResults({ searchParams = {}, onPageChange }: OnlineSearchResultsProps) {
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const { data: searchResults, isLoading, error } = useQuery<CaseSearchResponse>({
    queryKey: ['online-search-cases', searchParams],
    queryFn: () => apiClient.searchOnlineCases(searchParams),
    enabled: Object.keys(searchParams).length > 0,
  })

  const handleExport = async () => {
    if (isExporting) return
    
    setIsExporting(true)
    try {
      // Create export parameters without pagination to get all results
      const exportParams = { ...searchParams }
      // Remove pagination parameters for export
      delete exportParams.page
      delete exportParams.page_size
      
      const blob = await apiClient.exportOnlineCasesCSV(exportParams)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Generate filename with search criteria info
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const hasFilters = Object.keys(exportParams).length > 0
      const filename = hasFilters 
        ? `online_cbirc_search_results_${timestamp}.csv`
        : `online_cbirc_all_cases_${timestamp}.csv`
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('Online export completed successfully')
    } catch (error) {
      console.error('Online export failed:', error)
      // TODO: Add toast notification for error
      alert('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  if (Object.keys(searchParams).length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>请设置搜索条件开始搜索在线案例</p>
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
            <p>搜索在线案例中...</p>
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
            <p>未找到匹配的在线案例</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatAmount = (amount?: number) => {
    if (!amount) return '未知'
    return `${amount.toLocaleString()}元`
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>在线案例搜索结果</CardTitle>
              <CardDescription>
                共找到 {searchResults.total} 条在线案例
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm" disabled={isExporting}>
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? '导出中...' : '导出CSV'}
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
                      <Badge variant="default" className="text-xs bg-blue-500">
                        在线数据
                      </Badge>
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

      {/* Case Detail Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>在线案例详情</DialogTitle>
          </DialogHeader>
          
          {selectedCase && (
            <div className="space-y-4">
              {/* 基本信息 - 紧凑版 */}
              <div className="bg-muted/30 rounded-lg p-3">
                <h3 className="font-semibold mb-2 text-sm">基本信息</h3>
                <div className="space-y-2">
                  <div className="text-xs">
                    <span className="font-medium">标题：</span>
                    <span className="text-muted-foreground">{selectedCase.title}</span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="font-medium">文号：</span>
                      <div className="text-muted-foreground break-words">{selectedCase.subtitle}</div>
                    </div>
                    <div>
                      <span className="font-medium">发布日期：</span>
                      <div className="text-muted-foreground">{selectedCase.publish_date}</div>
                    </div>
                    <div>
                      <span className="font-medium">处罚金额：</span>
                      <div className="text-red-600 font-medium">{formatAmount(selectedCase.amount)}</div>
                    </div>
                    <div>
                      <span className="font-medium">地区：</span>
                      <div className="text-muted-foreground">{selectedCase.province || '未知'}</div>
                    </div>
                    <div>
                      <span className="font-medium">行业：</span>
                      <div className="text-muted-foreground">{selectedCase.industry || '未知'}</div>
                    </div>
                    <div>
                      <span className="font-medium">处罚机关：</span>
                      <div className="text-muted-foreground break-words">{selectedCase.org || '未提供'}</div>
                    </div>
                    <div className="lg:col-span-2">
                      <span className="font-medium">当事人：</span>
                      <div className="text-muted-foreground break-words">{selectedCase.people || '未提供'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 详细信息 - 紧凑网格布局 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* 违法事实 */}
                {selectedCase.event && (
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                    <h3 className="font-semibold mb-1 text-sm text-red-900 dark:text-red-100">违法事实</h3>
                    <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">{selectedCase.event}</p>
                  </div>
                )}

                {/* 处罚依据 */}
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
                  <h3 className="font-semibold mb-1 text-sm text-purple-900 dark:text-purple-100">处罚依据</h3>
                  <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">{selectedCase.law || '未提供'}</p>
                </div>

                {/* 处罚决定 */}
                {selectedCase.penalty && (
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 lg:col-span-2">
                    <h3 className="font-semibold mb-1 text-sm text-green-900 dark:text-green-100">处罚决定</h3>
                    <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">{selectedCase.penalty}</p>
                  </div>
                )}
              </div>

              {/* 案例链接 */}
              <div className="flex justify-between items-center pt-2 border-t">
                <div>
                  <h3 className="font-semibold text-sm mb-1">案例链接</h3>
                  <a
                    href={`https://www.nfra.gov.cn/cn/view/pages/ItemDetail.html?docId=${selectedCase.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs"
                  >
                    查看原文
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCase(null)}
                  className="text-xs"
                >
                  关闭
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}