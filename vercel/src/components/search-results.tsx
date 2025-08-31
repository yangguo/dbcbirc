"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CaseDetail, CaseSearchResponse } from "@/types"

interface SearchResultsProps {
  results: CaseSearchResponse | null
  isLoading: boolean
  onLoadMore: () => void
}

export function SearchResults({ results, isLoading, onLoadMore }: SearchResultsProps) {
  if (isLoading && !results) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-lg text-foreground">搜索中...</div>
      </div>
    )
  }

  if (!results || results.cases.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-lg text-muted-foreground">暂无搜索结果</div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN')
    } catch {
      return dateStr
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">
          搜索结果 (共 {results.total} 条)
        </h2>
        <div className="text-sm text-muted-foreground">
          第 {results.page} 页，共 {Math.ceil(results.total / results.page_size)} 页
        </div>
      </div>
      
      <div className="grid gap-4">
        {results.cases.map((caseItem: CaseDetail, index: number) => (
          <Card key={index} className="hover:shadow-md transition-shadow bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                {caseItem.org || caseItem.机构 || '未知组织'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(caseItem.penalty_date || caseItem.处罚日期 || caseItem.publish_date || caseItem.发布日期) && (
                <div className="text-sm text-foreground">
                  <span className="font-medium">案例日期：</span>
                  {formatDate(caseItem.penalty_date || caseItem.处罚日期 || caseItem.publish_date || caseItem.发布日期 || '')}
                </div>
              )}
              
              {(caseItem.amount || caseItem.金额) && (
                <div className="text-sm text-foreground">
                  <span className="font-medium">罚款金额：</span>
                  <span className="text-destructive font-semibold">
                    {formatAmount(caseItem.amount || caseItem.金额 || 0)}
                  </span>
                </div>
              )}
              
              {(caseItem.event || caseItem.违法事实) && (
                <div className="text-sm text-foreground">
                  <span className="font-medium">违规描述：</span>
                  <p className="mt-1 text-muted-foreground line-clamp-3">
                    {caseItem.event || caseItem.违法事实}
                  </p>
                </div>
              )}
              
              {(caseItem.law || caseItem.法律依据) && (
                <div className="text-sm text-foreground">
                  <span className="font-medium">处罚依据：</span>
                  <p className="mt-1 text-muted-foreground line-clamp-2">
                    {caseItem.law || caseItem.法律依据}
                  </p>
                </div>
              )}
              
              {(caseItem.penalty || caseItem.处罚决定) && (
                <div className="text-sm text-foreground">
                  <span className="font-medium">处罚决定：</span>
                  <p className="mt-1 text-muted-foreground line-clamp-2">
                    {caseItem.penalty || caseItem.处罚决定}
                  </p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 pt-2">
                {(caseItem.province || caseItem.省份) && (
                  <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded">
                    {caseItem.province || caseItem.省份}
                  </span>
                )}
                {(caseItem.industry || caseItem.行业) && (
                  <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded">
                    {caseItem.industry || caseItem.行业}
                  </span>
                )}
                {(caseItem.org || caseItem.机构) && (
                  <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded">
                    {caseItem.org || caseItem.机构}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {results.page < Math.ceil(results.total / results.page_size) && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={onLoadMore} 
            disabled={isLoading}
            variant="outline"
            className="border-input text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {isLoading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  )
}