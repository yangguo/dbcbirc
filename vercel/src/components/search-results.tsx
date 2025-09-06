"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CaseDetail, CaseSearchResponse } from "@/types"
import { ChevronDown, ChevronUp, Download } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SearchResultsProps {
  results: CaseSearchResponse | null
  isLoading: boolean
  onLoadMore: () => void
}

export function SearchResults({ results, isLoading, onLoadMore }: SearchResultsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [isExporting, setIsExporting] = useState(false)

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  // 导出为CSV格式
  const exportToCSV = () => {
    if (!results || results.cases.length === 0) return
    
    setIsExporting(true)
    try {
      const headers = [
        '类别', '金额', '省份', '行业', '标题', '文号', '处罚机关', '被处罚当事人', 
        '处罚日期', '发布日期', '违法事实', '处罚依据', '处罚决定'
      ]
      
      const csvContent = [
        headers.join(','),
        ...results.cases.map(caseItem => [
          `"${(caseItem.分类 || caseItem.category || '').replace(/"/g, '""')}"`,
          `"${(caseItem.金额 !== undefined && caseItem.金额 !== null && caseItem.金额 > 0) ? caseItem.金额 : ((caseItem.amount !== undefined && caseItem.amount !== null && caseItem.amount > 0) ? caseItem.amount : (caseItem['行政处罚决定'] && (caseItem['行政处罚决定'].includes('万元') || caseItem['行政处罚决定'].includes('元'))) ? (caseItem['行政处罚决定'].match(/[\d,.]+\s*[万]?元/)?.[0] || '') : '')}"`,
          `"${(caseItem.省份 || caseItem.province || '').replace(/"/g, '""')}"`,
          `"${(caseItem.行业 || caseItem.industry || '').replace(/"/g, '""')}"`,
          `"${(caseItem.标题 || '').replace(/"/g, '""')}"`,
          `"${(caseItem.行政处罚决定书文号 || '').replace(/"/g, '""')}"`,
          `"${(caseItem.作出处罚决定的机关名称 || '').replace(/"/g, '""')}"`,
          `"${(caseItem.被处罚当事人 || '').replace(/"/g, '""')}"`,
          `"${formatDate(caseItem.作出处罚决定的日期 || '')}"`,
          `"${formatDate(caseItem.发布日期 || '')}"`,
          `"${(caseItem.主要违法违规事实 || '').replace(/"/g, '""')}"`,
          `"${(caseItem.行政处罚依据 || '').replace(/"/g, '""')}"`,
          `"${(caseItem.行政处罚决定 || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `搜索结果_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('导出CSV失败:', error)
      alert('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  // 导出为JSON格式
  const exportToJSON = () => {
    if (!results || results.cases.length === 0) return
    
    setIsExporting(true)
    try {
      const jsonData = {
        exportTime: new Date().toISOString(),
        total: results.total,
        page: results.page,
        pageSize: results.page_size,
        cases: results.cases
      }
      
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `搜索结果_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('导出JSON失败:', error)
      alert('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  // 导出为Excel格式（使用CSV格式，Excel可以打开）
  const exportToExcel = () => {
    if (!results || results.cases.length === 0) return
    
    setIsExporting(true)
    try {
      const headers = [
        '类别', '金额', '省份', '行业', '标题', '文号', '处罚机关', '被处罚当事人', 
        '处罚日期', '发布日期', '违法事实', '处罚依据', '处罚决定'
      ]
      
      const csvContent = [
        headers.join('\t'),
        ...results.cases.map(caseItem => [
          (caseItem.分类 || caseItem.category || '').replace(/\t/g, ' '),
          (caseItem.金额 !== undefined && caseItem.金额 !== null && caseItem.金额 > 0) ? caseItem.金额 : ((caseItem.amount !== undefined && caseItem.amount !== null && caseItem.amount > 0) ? caseItem.amount : (caseItem['行政处罚决定'] && (caseItem['行政处罚决定'].includes('万元') || caseItem['行政处罚决定'].includes('元'))) ? (caseItem['行政处罚决定'].match(/[\d,.]+\s*[万]?元/)?.[0] || '') : ''),
          (caseItem.省份 || caseItem.province || '').replace(/\t/g, ' '),
          (caseItem.行业 || caseItem.industry || '').replace(/\t/g, ' '),
          (caseItem.标题 || '').replace(/\t/g, ' '),
          (caseItem.行政处罚决定书文号 || '').replace(/\t/g, ' '),
          (caseItem.作出处罚决定的机关名称 || '').replace(/\t/g, ' '),
          (caseItem.被处罚当事人 || '').replace(/\t/g, ' '),
          formatDate(caseItem.作出处罚决定的日期 || ''),
          formatDate(caseItem.发布日期 || ''),
          (caseItem.主要违法违规事实 || '').replace(/\t/g, ' '),
          (caseItem.行政处罚依据 || '').replace(/\t/g, ' '),
          (caseItem.行政处罚决定 || '').replace(/\t/g, ' ')
        ].join('\t'))
      ].join('\n')
      
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `搜索结果_${new Date().toISOString().split('T')[0]}.xls`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('导出Excel失败:', error)
      alert('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }
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
    if (!dateStr || dateStr.trim() === '') {
      return '-'
    }
    
    try {
      const date = new Date(dateStr)
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return dateStr
      }
      return date.toLocaleDateString('zh-CN')
    } catch {
      return dateStr
    }
  }

  const formatAmount = (amount: number) => {
    // 不转换成货币格式，直接返回数字
    return amount.toLocaleString('zh-CN')
  }

  // 从机构名称提取省份
  const extractProvinceFromOrg = (orgName?: string) => {
    if (!orgName) return null
    
    const provincePatterns = [
      '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
      '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
      '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
      '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'
    ]
    
    for (const province of provincePatterns) {
      if (orgName.includes(province)) {
        return province === '内蒙古' ? '内蒙古自治区' : 
               province === '广西' ? '广西壮族自治区' :
               province === '西藏' ? '西藏自治区' :
               province === '宁夏' ? '宁夏回族自治区' :
               province === '新疆' ? '新疆维吾尔自治区' :
               ['北京', '天津', '上海', '重庆'].includes(province) ? province + '市' :
               province + '省'
      }
    }
    return null
  }

  // 从当事人名称提取行业信息
  const extractIndustryFromEntity = (entityName?: string) => {
    if (!entityName) return null
    
    const industryPatterns = [
      { keywords: ['银行', '农商银行', '村镇银行', '信用社'], industry: '银行' },
      { keywords: ['保险', '人寿', '财险', '平安'], industry: '保险' },
      { keywords: ['证券', '基金', '期货'], industry: '证券' },
      { keywords: ['信托'], industry: '信托' },
      { keywords: ['租赁'], industry: '租赁' },
      { keywords: ['小贷', '小额贷款'], industry: '小额贷款' }
    ]
    
    for (const pattern of industryPatterns) {
      if (pattern.keywords.some(keyword => entityName.includes(keyword))) {
        return pattern.industry
      }
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">
          搜索结果 (共 {results.total} 条)
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            第 {results.page} 页，共 {Math.ceil(results.total / results.page_size)} 页
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isExporting || !results || results.cases.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isExporting ? '导出中...' : '下载结果'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV} disabled={isExporting}>
                导出为 CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} disabled={isExporting}>
                导出为 Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToJSON} disabled={isExporting}>
                导出为 JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Debug information - remove this in production */}
        {process.env.NODE_ENV === 'development' && results.cases.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border">
            <details>
              <summary className="cursor-pointer text-sm font-medium">调试信息 (仅开发环境显示)</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(results.cases[0], null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        {results.cases.map((caseItem: CaseDetail, index: number) => {
          const isExpanded = expandedItems.has(index)
          return (
            <Card key={index} className="hover:shadow-md transition-shadow bg-card border-border">
              <CardHeader className="cursor-pointer" onClick={() => toggleExpanded(index)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-foreground mb-2">
                      {caseItem.标题 || '处罚决定书'}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">处罚机关：</span>
                      {caseItem.作出处罚决定的机关名称 || '未知机关'}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="p-1">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 核心信息表格 - 突出显示类别、金额、省份、行业 */}
                <div className="bg-muted/30 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-border/50">
                    <div className="p-3 border-r border-border/50 bg-accent/20">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">类别</div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {caseItem.category || caseItem.分类 || caseItem['主要违法违规事实'] || '-'}
                      </div>
                    </div>
                    <div className="p-3 border-r border-border/50 md:border-r-0 bg-accent/20">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">金额</div>
                      <div className="mt-1 text-sm font-semibold text-destructive">
                        {(caseItem.amount !== undefined && caseItem.amount !== null && caseItem.amount > 0) 
                          ? formatAmount(caseItem.amount) 
                          : (caseItem.金额 !== undefined && caseItem.金额 !== null && caseItem.金额 > 0)
                            ? formatAmount(caseItem.金额)
                            : (caseItem['行政处罚决定'] && (caseItem['行政处罚决定'].includes('万元') || caseItem['行政处罚决定'].includes('元')))
                              ? caseItem['行政处罚决定'].match(/[\d,.]+\s*[万]?元/)?.[0] || caseItem['行政处罚决定']
                              : '-'}
                      </div>
                    </div>
                    <div className="p-3 border-r border-border/50 bg-accent/20">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">省份</div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {caseItem.province || caseItem.省份 || extractProvinceFromOrg(caseItem.作出处罚决定的机关名称) || '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-accent/20">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">行业</div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {caseItem.industry || caseItem.行业 || extractIndustryFromEntity(caseItem.被处罚当事人) || '-'}
                      </div>
                    </div>
                  </div>
                  
                  {/* 其他基本信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3">
                    {(caseItem.行政处罚决定书文号) && (
                      <div className="text-sm">
                        <span className="font-medium text-foreground">文号：</span>
                        <div className="text-muted-foreground">{caseItem.行政处罚决定书文号}</div>
                      </div>
                    )}
                    
                    {(caseItem.作出处罚决定的日期) && (
                      <div className="text-sm">
                        <span className="font-medium text-foreground">处罚日期：</span>
                        <div className="text-muted-foreground">
                          {formatDate(caseItem.作出处罚决定的日期 || '')}
                        </div>
                      </div>
                    )}
                    
                    {(caseItem.发布日期) && (
                      <div className="text-sm">
                        <span className="font-medium text-foreground">发布日期：</span>
                        <div className="text-muted-foreground">
                          {formatDate(caseItem.发布日期 || '')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 当事人信息 */}
                {(caseItem.被处罚当事人) && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">当事人：</span>
                    <div className="text-muted-foreground mt-1">{caseItem.被处罚当事人}</div>
                  </div>
                )}
                
                {/* 违法事实 */}
                {(caseItem.主要违法违规事实) && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">违法事实：</span>
                    <div className={`mt-1 text-muted-foreground ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {caseItem.主要违法违规事实}
                    </div>
                  </div>
                )}
              
                {isExpanded && (
                  <>
                    {/* 处罚依据 */}
                    {(caseItem.行政处罚依据) && (
                      <div className="text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                        <span className="font-medium text-blue-900 dark:text-blue-100">处罚依据：</span>
                        <div className="mt-1 text-blue-800 dark:text-blue-200">
                          {caseItem.行政处罚依据}
                        </div>
                      </div>
                    )}
                    
                    {/* 处罚决定 */}
                    {(caseItem.行政处罚决定) && (
                      <div className="text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                        <span className="font-medium text-red-900 dark:text-red-100">处罚决定：</span>
                        <div className="mt-1 text-red-800 dark:text-red-200">
                          {caseItem.行政处罚决定}
                        </div>
                      </div>
                    )}
                    
                    {/* 副标题 */}
                    {(caseItem.副标题) && (
                      <div className="text-sm bg-gray-50 dark:bg-gray-900/20 p-3 rounded-lg">
                        <span className="font-medium text-foreground">副标题：</span>
                        <div className="mt-1 text-muted-foreground">
                          {caseItem.副标题}
                        </div>
                      </div>
                    )}
                    
                    {/* 内容摘要 */}
                    {(caseItem.内容) && (
                      <div className="text-sm bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                        <span className="font-medium text-yellow-900 dark:text-yellow-100">内容摘要：</span>
                        <div className="mt-1 text-yellow-800 dark:text-yellow-200 max-h-32 overflow-y-auto">
                          {caseItem.内容}
                        </div>
                      </div>
                    )}
                    
                    {/* 其他详细信息 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(caseItem).map(([key, value]) => {
                        // 跳过已经显示的字段和英文字段映射
                        const skipFields = ['作出处罚决定的机关名称', '标题', '行政处罚决定书文号', '文号',
                                          '被处罚当事人', '作出处罚决定的日期', 
                                          '发布日期', '金额', '主要违法违规事实', 
                                          '行政处罚依据', '行政处罚决定',
                                          '省份', '行业', '副标题', 
                                          '内容', '分类', 'id', '_id',
                                          'province', 'industry', 'category', 'penalty_type',
                                          // 跳过英文字段映射，避免重复显示
                                          'title', 'org', 'wenhao', 'people', 'event', 'penalty', 
                                          'penalty_date', 'publish_date', 'law', 'amount']
                        
                        if (skipFields.includes(key) || !value || value === '') {
                          return null
                        }
                        
                        // 字段名映射 - 只保留实际使用的字段
                        const fieldNameMap: { [key: string]: string } = {
                          '违法行为': '违法行为',
                          '适用法条': '适用法条',
                          '处罚依据条款': '处罚依据条款',
                          '案件来源': '案件来源',
                          '调查机关': '调查机关',
                          '审理机关': '审理机关',
                          '复议机关': '复议机关',
                          '执行情况': '执行情况',
                          '结案日期': '结案日期',
                          '公示日期': '公示日期',
                          '备注信息': '备注信息'
                        }
                        
                        const displayName = fieldNameMap[key] || key
                        
                        return (
                          <div key={key} className="text-sm bg-gray-50 dark:bg-gray-900/20 p-2 rounded">
                            <span className="font-medium text-foreground">{displayName}：</span>
                            <div className="mt-1 text-muted-foreground text-xs break-all">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              
                {/* 标签区域 */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {(caseItem.省份 || caseItem.province) && (
                    <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                      📍 {caseItem.省份 || caseItem.province}
                    </span>
                  )}
                  {(caseItem.行业 || caseItem.industry) && (
                    <span className="inline-flex items-center bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                      🏢 {caseItem.行业 || caseItem.industry}
                    </span>
                  )}
                  {(caseItem.分类 || caseItem.category) && (
                    <span className="inline-flex items-center bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs px-2 py-1 rounded-full">
                      📂 {caseItem.分类 || caseItem.category}
                    </span>
                  )}

                  <span className="inline-flex items-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                    {isExpanded ? '点击收起' : '点击展开详情'}
                  </span>
                </div>
            </CardContent>
            </Card>
          )
        })}
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
