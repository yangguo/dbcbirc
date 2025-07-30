'use client'

import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { RefreshCw, Download, CheckCircle, XCircle, Clock, AlertCircle, Database, Globe } from 'lucide-react'

interface UpdateTask {
  id: string
  type: 'cases' | 'details'
  orgName: string
  startPage: number
  endPage: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  createdAt: string
  completedAt?: string
  error?: string
  results?: {
    total: number
    updated: number
    skipped: number
  }
}

export function CaseUpdate() {
  const [selectedOrg, setSelectedOrg] = useState('')
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(1)
  const [updateType, setUpdateType] = useState<'cases' | 'details'>('cases')

  const { toast } = useToast()

  // Mock update tasks data
  const updateTasks: UpdateTask[] = [
    {
      id: 'task-001',
      type: 'cases',
      orgName: '银保监会机关',
      startPage: 1,
      endPage: 5,
      status: 'completed',
      progress: 100,
      createdAt: '2024-01-15 14:30',
      completedAt: '2024-01-15 14:45',
      results: { total: 150, updated: 120, skipped: 30 }
    },
    {
      id: 'task-002',
      type: 'details',
      orgName: '银保监局本级',
      startPage: 1,
      endPage: 3,
      status: 'running',
      progress: 65,
      createdAt: '2024-01-15 14:25'
    },
    {
      id: 'task-003',
      type: 'cases',
      orgName: '银保监分局本级',
      startPage: 1,
      endPage: 2,
      status: 'failed',
      progress: 0,
      createdAt: '2024-01-15 14:20',
      error: '网络连接超时'
    }
  ]

  // Get system info
  const { data: systemInfo, isLoading: systemLoading } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: () => apiClient.getSystemInfo(),
  })

  // Get case summary
  const { data: caseSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['caseSummary', selectedOrg],
    queryFn: () => selectedOrg ? apiClient.getCaseSummaryByOrg(selectedOrg) : null,
    enabled: !!selectedOrg,
  })

  // Update cases mutation
  const updateCasesMutation = useMutation({
    mutationFn: ({ orgName, startPage, endPage }: { orgName: string; startPage: number; endPage: number }) => 
      apiClient.updateCases(orgName, startPage, endPage),
    onSuccess: (data) => {
      toast({
        title: '案例更新成功',
        description: `已成功更新案例数据`,
      })
    },
    onError: (error) => {
      toast({
        title: '案例更新失败',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Update case details mutation
  const updateDetailsMutation = useMutation({
    mutationFn: ({ orgName }: { orgName: string }) => 
      apiClient.updateCaseDetails(orgName),
    onSuccess: (data) => {
      toast({
        title: '案例详情更新成功',
        description: `已成功更新案例详情`,
      })
    },
    onError: (error) => {
      toast({
        title: '案例详情更新失败',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Refresh data mutation
  const refreshDataMutation = useMutation({
    mutationFn: () => apiClient.refreshData(),
    onSuccess: () => {
      toast({
        title: '数据刷新成功',
        description: '所有数据已刷新',
      })
    },
    onError: (error) => {
      toast({
        title: '数据刷新失败',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleUpdateCases = () => {
    if (!selectedOrg) {
      toast({
        title: '请选择机构',
        description: '请先选择要更新的机构',
        variant: 'destructive',
      })
      return
    }

    if (updateType === 'cases') {
      updateCasesMutation.mutate({ orgName: selectedOrg, startPage, endPage })
    } else {
      updateDetailsMutation.mutate({ orgName: selectedOrg })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">已完成</Badge>
      case 'failed':
        return <Badge variant="destructive">失败</Badge>
      case 'running':
        return <Badge variant="secondary">运行中</Badge>
      default:
        return <Badge variant="outline">等待中</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据库状态</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemLoading ? '...' : (systemInfo as any)?.database_status || '正常'}
            </div>
            <p className="text-xs text-muted-foreground">
              MongoDB连接状态
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">网络状态</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">正常</div>
            <p className="text-xs text-muted-foreground">
              CBIRC网站连接状态
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最后更新</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemLoading ? '...' : '1小时前'}
            </div>
            <p className="text-xs text-muted-foreground">
              数据最后更新时间
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Update Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              案例数据更新
            </CardTitle>
            <CardDescription>
              从CBIRC网站更新最新的案例数据
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="updateType">更新类型</Label>
                <Select
                  value={updateType}
                  onValueChange={(value: 'cases' | 'details') => setUpdateType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cases">案例列表更新</SelectItem>
                    <SelectItem value="details">案例详情更新</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="organization">选择机构</Label>
                <Select
                  value={selectedOrg}
                  onValueChange={setSelectedOrg}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择机构" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="银保监会机关">银保监会机关</SelectItem>
                    <SelectItem value="银保监局本级">银保监局本级</SelectItem>
                    <SelectItem value="银保监分局本级">银保监分局本级</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {updateType === 'cases' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startPage">起始页</Label>
                      <Input
                        id="startPage"
                        type="number"
                        min="1"
                        value={startPage}
                        onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endPage">结束页</Label>
                      <Input
                        id="endPage"
                        type="number"
                        min="1"
                        value={endPage}
                        onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateCases} 
                  disabled={updateCasesMutation.isPending || updateDetailsMutation.isPending}
                  className="flex-1"
                >
                  {(updateCasesMutation.isPending || updateDetailsMutation.isPending) ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  开始更新
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">注意事项</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    • 案例列表更新会获取指定页面范围的案例摘要<br/>
                    • 案例详情更新会获取案例的完整内容<br/>
                    • 更新过程可能需要几分钟时间<br/>
                    • 请确保网络连接稳定
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>
              常用的数据更新和管理操作
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Button 
                variant="outline" 
                onClick={() => refreshDataMutation.mutate()}
                disabled={refreshDataMutation.isPending}
                className="justify-start"
              >
                {refreshDataMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                刷新所有数据
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setSelectedOrg('银保监会机关')}
                className="justify-start"
              >
                <Database className="h-4 w-4 mr-2" />
                更新机关案例
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setSelectedOrg('银保监局本级')}
                className="justify-start"
              >
                <Database className="h-4 w-4 mr-2" />
                更新本级案例
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setSelectedOrg('银保监分局本级')}
                className="justify-start"
              >
                <Database className="h-4 w-4 mr-2" />
                更新分局案例
              </Button>
            </div>

            {selectedOrg && caseSummary && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{selectedOrg} 数据概览</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>总案例数: {(caseSummary as any)?.total || 0}</div>
                  <div>最新更新: {(caseSummary as any)?.lastUpdate || '未知'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Tasks History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            更新任务历史
          </CardTitle>
          <CardDescription>
            近期的数据更新任务状态和结果
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务ID</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>机构</TableHead>
                <TableHead>页面范围</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {updateTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-sm">{task.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {task.type === 'cases' ? '案例列表' : '案例详情'}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.orgName}</TableCell>
                  <TableCell>
                    {task.type === 'cases' ? `${task.startPage}-${task.endPage}页` : '全部'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      {getStatusBadge(task.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={task.progress} className="w-20" />
                      <span className="text-xs text-muted-foreground">
                        {task.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.results ? (
                      <div className="text-sm">
                        <div>总数: {task.results.total}</div>
                        <div>更新: {task.results.updated}</div>
                        <div>跳过: {task.results.skipped}</div>
                      </div>
                    ) : task.error ? (
                      <Badge variant="destructive">错误</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{task.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
