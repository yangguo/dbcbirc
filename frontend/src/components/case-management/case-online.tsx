'use client'

import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { RefreshCw, Download, Clock, AlertCircle, Database, Globe, Upload, Trash2, Tags } from 'lucide-react'
// import { Alert, AlertDescription } from '@/components/ui/alert' // Temporarily disabled

interface OnlineStats {
  analysis_data: {
    count: number
    unique_ids: number
  }
  event_data: {
    count: number
    unique_ids: number
  }
  amount_data: {
    count: number
    unique_ids: number
  }
  online_data: {
    count: number
    unique_ids: number
  }
  diff_data: {
    count: number
    unique_ids: number
  }
}

interface DiffDataItem {
  id: string
  title: string
  subtitle: string
  publish_date: string
  decision_number: string
  punished_party: string
  violation_facts: string
  legal_basis: string
  penalty_decision: string
  authority_name: string
  decision_date: string
}

export function CaseOnline() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDiffData, setShowDiffData] = useState(false)
  
  const { toast } = useToast()

  // Get case online statistics
  const { data: onlineStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['caseOnlineStats'],
    queryFn: async () => {
      const result = await apiClient.getCaseOnlineStats()
      return result as OnlineStats
    },
    // refetchInterval: 5000, // Disabled automatic refresh
  })

  // Get diff data
  const { data: diffData, isLoading: diffDataLoading, refetch: refetchDiffData } = useQuery({
    queryKey: ['caseDiffData'],
    queryFn: async () => {
      const result = await apiClient.getCaseDiffData()
      return result as DiffDataItem[]
    },
    enabled: showDiffData,
  })

  // Delete case data
  const deleteCaseDataMutation = useMutation({
    mutationFn: () => apiClient.deleteCaseData(),
    onMutate: () => {
      setIsProcessing(true)
    },
    onSuccess: () => {
      toast({
        title: 'Case data deleted successfully',
        description: 'Online case data has been successfully deleted',
      })
      refetchStats()
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete case data',
        description: error.message || 'An error occurred while deleting case data',
        variant: 'destructive',
      })
    },
    onSettled: () => {
      setIsProcessing(false)
    },
  })

  // Update online cases
  const updateOnlineCasesMutation = useMutation({
    mutationFn: () => apiClient.updateOnlineCases(),
    onMutate: () => {
      setIsProcessing(true)
    },
    onSuccess: () => {
      toast({
        title: 'Case data online successfully',
        description: 'Diff data has been successfully uploaded to database',
      })
      refetchStats()
      refetchDiffData()
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to upload case data',
        description: error.message || 'An error occurred while uploading case data',
        variant: 'destructive',
      })
    },
    onSettled: () => {
      setIsProcessing(false)
    },
  })

  // Download diff data
  const downloadDiffDataMutation = useMutation({
    mutationFn: () => apiClient.downloadDiffData(),
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([data], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'case_diff_data.json'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Download successful',
        description: 'Diff data has been successfully downloaded',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Download failed',
        description: error.message || 'An error occurred while downloading diff data',
        variant: 'destructive',
      })
    },
  })

  const handleDeleteCaseData = () => {
    if (window.confirm('确定要删除所有在线案例数据吗？此操作无法撤销。')) {
      deleteCaseDataMutation.mutate()
    }
  }

  const handleUpdateOnlineCases = () => {
    if (window.confirm('确定要上传差异数据吗？')) {
      updateOnlineCasesMutation.mutate()
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('zh-CN')
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      {/* Data Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分析数据</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '-' : onlineStats?.analysis_data?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              唯一ID数: {statsLoading ? '-' : onlineStats?.analysis_data?.unique_ids || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">事件数据</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '-' : onlineStats?.event_data?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              唯一ID数: {statsLoading ? '-' : onlineStats?.event_data?.unique_ids || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分类数据</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '-' : onlineStats?.amount_data?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              唯一ID数: {statsLoading ? '-' : onlineStats?.amount_data?.unique_ids || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在线数据</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '-' : onlineStats?.online_data?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              在线案例数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">差异数据</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '-' : onlineStats?.diff_data?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              待处理案例数量
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operations Area */}
      <Card>
        <CardHeader>
          <CardTitle>案例上线操作</CardTitle>
          <CardDescription>
            管理案例数据上线和删除操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProcessing && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">正在处理，请稍候...</span>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                refetchStats()
                if (showDiffData) refetchDiffData()
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新数据
            </Button>
            
            <Button
              onClick={() => downloadDiffDataMutation.mutate()}
              variant="outline"
              size="sm"
              disabled={downloadDiffDataMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              下载差异数据
            </Button>
            
            <Button
              onClick={() => setShowDiffData(!showDiffData)}
              variant="outline"
              size="sm"
            >
              {showDiffData ? '隐藏' : '查看'}差异数据
            </Button>
            
            <Button
              onClick={handleUpdateOnlineCases}
              disabled={isProcessing || onlineStats?.diff_data?.count === 0}
              size="sm"
            >
              <Upload className="mr-2 h-4 w-4" />
              更新在线案例
            </Button>
            
            <Button
              onClick={handleDeleteCaseData}
              disabled={isProcessing || onlineStats?.online_data?.count === 0}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除案例数据
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diff Data Table */}
      {showDiffData && (
        <Card>
          <CardHeader>
            <CardTitle>差异数据详情</CardTitle>
            <CardDescription>
              显示待上传的案例数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            {diffDataLoading ? (
              <div className="text-center py-4">
                加载中...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>文书编号</TableHead>
                    <TableHead>发布日期</TableHead>
                    <TableHead>被处罚方</TableHead>
                    <TableHead>处罚机关</TableHead>
                    <TableHead>决定日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(diffData) && diffData.length > 0 ? diffData.slice(0, 100).map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell className="max-w-xs truncate" title={item.title}>
                        {item.title}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={item.subtitle}>
                        {item.subtitle}
                      </TableCell>
                      <TableCell>{formatDate(item.publish_date)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={item.punished_party}>
                        {item.punished_party}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={item.authority_name}>
                        {item.authority_name}
                      </TableCell>
                      <TableCell>{formatDate(item.decision_date)}</TableCell>
                    </TableRow>
                  )) : null}
                </TableBody>
              </Table>
            )}
            {Array.isArray(diffData) && diffData.length > 100 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                显示前100条记录，共{diffData.length}条记录
              </div>
            )}
            {Array.isArray(diffData) && diffData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无差异数据
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}