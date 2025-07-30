'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { Search, Filter, RefreshCw, Eye, Edit, Trash2, FileText } from 'lucide-react'

interface CaseData {
  id: string
  title: string
  subtitle: string
  publish_date: string
  content: string
  category?: string
  amount?: number
  province?: string
}

interface CaseListResponse {
  data: CaseData[]
  total: number
}

export function CaseList() {
  const [searchForm, setSearchForm] = useState({
    orgName: 'all',
    keyword: '',
    category: 'all',
    dateRange: 'all'
  })
  const [selectedCases, setSelectedCases] = useState<string[]>([])

  const { toast } = useToast()

  // Query for case data
  const { data: caseData, isLoading, refetch } = useQuery({
    queryKey: ['caseList', searchForm],
    queryFn: () => apiClient.getCaseDetail(searchForm.orgName === 'all' ? undefined : searchForm.orgName),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleSearch = () => {
    refetch()
    toast({
      title: '搜索完成',
      description: '案例数据已更新',
    })
  }

  const handleSelectCase = (caseId: string) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    )
  }

  const handleSelectAll = () => {
    const data = caseData as CaseListResponse
    if (!data?.data) return
    
    if (selectedCases.length === data.data.length) {
      setSelectedCases([])
    } else {
      setSelectedCases(data.data.map((case_: CaseData) => case_.id))
    }
  }

  const handleBatchDelete = () => {
    toast({
      title: '批量删除',
      description: `已选择 ${selectedCases.length} 个案例进行删除`,
    })
    // TODO: Implement batch delete
  }

  const handleEditCase = (caseId: string) => {
    toast({
      title: '编辑案例',
      description: `准备编辑案例 ${caseId}`,
    })
    // TODO: Navigate to edit page
  }

  const handleViewCase = (caseId: string) => {
    toast({
      title: '查看案例',
      description: `查看案例 ${caseId} 的详细信息`,
    })
    // TODO: Navigate to view page
  }

  const cases = (caseData as CaseListResponse)?.data || []
  const totalCases = (caseData as CaseListResponse)?.total || 0

  return (
    <div className="space-y-6">
      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            案例搜索与筛选
          </CardTitle>
          <CardDescription>
            搜索和筛选案例数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="orgName">机构类型</Label>
              <Select
                value={searchForm.orgName}
                onValueChange={(value) => setSearchForm({ ...searchForm, orgName: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择机构类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部机构</SelectItem>
                  <SelectItem value="银保监会机关">银保监会机关</SelectItem>
                  <SelectItem value="银保监局本级">银保监局本级</SelectItem>
                  <SelectItem value="银保监分局本级">银保监分局本级</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="keyword">关键词</Label>
              <Input
                id="keyword"
                placeholder="输入搜索关键词"
                value={searchForm.keyword}
                onChange={(e) => setSearchForm({ ...searchForm, keyword: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">案例分类</Label>
              <Select
                value={searchForm.category}
                onValueChange={(value) => setSearchForm({ ...searchForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  <SelectItem value="银行">银行</SelectItem>
                  <SelectItem value="保险">保险</SelectItem>
                  <SelectItem value="混合">混合</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dateRange">时间范围</Label>
              <Select
                value={searchForm.dateRange}
                onValueChange={(value) => setSearchForm({ ...searchForm, dateRange: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部时间</SelectItem>
                  <SelectItem value="recent">最近一月</SelectItem>
                  <SelectItem value="quarter">最近一季</SelectItem>
                  <SelectItem value="year">最近一年</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              搜索
            </Button>
            <Button variant="outline" onClick={() => setSearchForm({ orgName: 'all', keyword: '', category: 'all', dateRange: 'all' })}>
              <Filter className="h-4 w-4 mr-2" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总案例数</p>
                <p className="text-2xl font-bold">{totalCases}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已选择</p>
                <p className="text-2xl font-bold">{selectedCases.length}</p>
              </div>
              <Badge variant="outline" className="text-lg">{selectedCases.length}</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">筛选结果</p>
                <p className="text-2xl font-bold">{cases.length}</p>
              </div>
              <Search className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">操作</p>
                <p className="text-sm text-muted-foreground">批量操作</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBatchDelete}
                disabled={selectedCases.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Case List Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>案例列表</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedCases.length === cases.length && cases.length > 0 ? '取消全选' : '全选'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>加载中...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无案例数据</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">选择</TableHead>
                  <TableHead>案例标题</TableHead>
                  <TableHead>文号</TableHead>
                  <TableHead>发布日期</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>地区</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((case_: CaseData) => (
                  <TableRow key={case_.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedCases.includes(case_.id)}
                        onChange={() => handleSelectCase(case_.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {case_.title}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {case_.subtitle}
                    </TableCell>
                    <TableCell>
                      {case_.publish_date}
                    </TableCell>
                    <TableCell>
                      {case_.category && (
                        <Badge variant="outline">{case_.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {case_.province && (
                        <Badge variant="secondary">{case_.province}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {case_.amount ? `¥${case_.amount.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => handleViewCase(case_.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditCase(case_.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
