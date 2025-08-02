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
import { RefreshCw, Download, CheckCircle, XCircle, Clock, AlertCircle, Database, Globe, List, FileText } from 'lucide-react'

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

interface PendingCase {
  id: string
  title: string
  subtitle: string
  publish_date: string
  content: string
}

interface PendingCasesData {
  org_name: string
  pending_cases: PendingCase[]
  total: number
  timestamp: string
}

export function CaseUpdate() {
  const [selectedOrg, setSelectedOrg] = useState('')
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(1)
  const [updateType, setUpdateType] = useState<'cases' | 'details'>('cases')
  const [showCaseSelection, setShowCaseSelection] = useState(false)
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([])

  const { toast } = useToast()

  // Get real tasks from API instead of mock data
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: () => apiClient.getTasks(20),
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  const updateTasks = (tasksData as any)?.tasks || []

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

  // Query for pending cases (when selection is shown)
  const { data: pendingCasesData, isLoading: pendingCasesLoading } = useQuery({
    queryKey: ['pendingCases', selectedOrg],
    queryFn: () => apiClient.getPendingCases(selectedOrg),
    enabled: showCaseSelection && !!selectedOrg, // Only fetch when selection dialog is shown and org is selected
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

  // Update selected case details mutation
  const updateSelectedCaseDetailsMutation = useMutation({
    mutationFn: ({ orgName, selectedCaseIds }: { orgName: string; selectedCaseIds: string[] }) => 
      apiClient.updateSelectedCaseDetails(orgName, selectedCaseIds),
    onSuccess: (result) => {
      toast({
        title: '选择性更新任务已启动',
        description: `已开始更新选中的 ${selectedCaseIds.length} 个案例`,
      })
      // Reset selection state
      setShowCaseSelection(false)
      setSelectedCaseIds([])
    },
    onError: (error) => {
      toast({
        title: '选择性更新失败',
        description: '启动选择性案例详情更新任务失败，请重试',
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

  const handleShowCaseSelection = () => {
    if (!selectedOrg) {
      toast({
        title: '请选择机构',
        description: '请先选择要更新的机构',
        variant: 'destructive',
      })
      return
    }
    setShowCaseSelection(true)
    setSelectedCaseIds([]) // Reset selection when opening
  }

  const handleCaseSelectionChange = (caseId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedCaseIds(prev => [...prev, caseId])
    } else {
      setSelectedCaseIds(prev => prev.filter(id => id !== caseId))
    }
  }

  const handleSelectAllCases = () => {
    if (pendingCasesData) {
      const allCaseIds = (pendingCasesData as any).pending_cases.map((c: any) => c.id)
      setSelectedCaseIds(allCaseIds)
    }
  }

  const handleDeselectAllCases = () => {
    setSelectedCaseIds([])
  }

  const handleSelect100Cases = () => {
    if (pendingCasesData) {
      const allCaseIds = (pendingCasesData as any).pending_cases.map((c: any) => c.id)
      const currentlySelected = new Set(selectedCaseIds)
      
      // Find unselected cases
      const unselectedCases = allCaseIds.filter((id: string) => !currentlySelected.has(id))
      
      // Take up to 100 more unselected cases
      const next100Cases = unselectedCases.slice(0, 100)
      
      // Add to existing selection
      setSelectedCaseIds(prev => [...prev, ...next100Cases])
    }
  }

  const handleUpdateSelectedCases = () => {
    if (selectedCaseIds.length === 0) {
      toast({
        title: '请选择案例',
        description: '请至少选择一个案例进行更新',
        variant: 'destructive',
      })
      return
    }

    updateSelectedCaseDetailsMutation.mutate({
      orgName: selectedOrg,
      selectedCaseIds
    })
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
                {updateType === 'details' ? (
                  <>
                    <Button 
                      onClick={handleUpdateCases} 
                      disabled={updateCasesMutation.isPending || updateDetailsMutation.isPending || updateSelectedCaseDetailsMutation.isPending}
                      className="flex-1"
                    >
                      {(updateCasesMutation.isPending || updateDetailsMutation.isPending) ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      更新全部详情
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleShowCaseSelection} 
                      disabled={updateCasesMutation.isPending || updateDetailsMutation.isPending || updateSelectedCaseDetailsMutation.isPending}
                      className="flex-1"
                    >
                      <List className="h-4 w-4 mr-2" />
                      选择案例更新
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={handleUpdateCases} 
                    disabled={updateCasesMutation.isPending || updateDetailsMutation.isPending || updateSelectedCaseDetailsMutation.isPending}
                    className="flex-1"
                  >
                    {(updateCasesMutation.isPending || updateDetailsMutation.isPending) ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    开始更新
                  </Button>
                )}
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
                  <TableCell>{task.org_name || task.orgName}</TableCell>
                  <TableCell>
                    {task.type === 'cases' ? `${task.start_page || task.startPage}-${task.end_page || task.endPage}页` : '全部'}
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
                    ) : task.error_message || task.error ? (
                      <Badge variant="destructive">错误</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{task.created_at || task.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Case Selection Interface */}
      {showCaseSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>选择要更新的案例</CardTitle>
              <CardDescription>
                为 <strong>{selectedOrg}</strong> 选择需要更新详情的案例
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto">
              {pendingCasesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>加载待更新案例中...</span>
                </div>
              ) : pendingCasesData && (pendingCasesData as any).pending_cases.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                    <div className="text-sm">
                      共 <strong>{(pendingCasesData as any).total}</strong> 个案例待更新
                      {selectedCaseIds.length > 0 && (
                        <span className="ml-2">
                          (已选择 <strong>{selectedCaseIds.length}</strong> 个)
                        </span>
                      )}
                    </div>
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSelectAllCases}
                      >
                        全选
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSelect100Cases}
                      >
                        选择100个
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDeselectAllCases}
                      >
                        取消全选
                      </Button>
                      {selectedCaseIds.length > 0 && (
                        <Button 
                          size="sm" 
                          onClick={handleUpdateSelectedCases}
                          disabled={updateSelectedCaseDetailsMutation.isPending}
                        >
                          {updateSelectedCaseDetailsMutation.isPending ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <FileText className="h-3 w-3 mr-1" />
                          )}
                          更新 ({selectedCaseIds.length})
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(pendingCasesData as any).pending_cases.map((case_item: any) => (
                      <div key={case_item.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                        <input
                          type="checkbox"
                          id={`case-${case_item.id}`}
                          className="mt-1"
                          checked={selectedCaseIds.includes(case_item.id)}
                          onChange={(e) => 
                            handleCaseSelectionChange(case_item.id, e.target.checked)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`case-${case_item.id}`}
                            className="cursor-pointer block"
                          >
                            <div className="font-medium text-sm truncate">
                              {case_item.title || '无标题'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="inline-block mr-4">
                                <strong>ID:</strong> {case_item.id}
                              </span>
                              <span className="inline-block mr-4">
                                <strong>文号:</strong> {case_item.subtitle || '无'}
                              </span>
                              <span className="inline-block">
                                <strong>日期:</strong> {case_item.publish_date || '无'}
                              </span>
                            </div>
                            {case_item.content && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {case_item.content}
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无待更新的案例</p>
                  <p className="text-sm mt-2">所有案例的详情都已更新完成</p>
                </div>
              )}
            </CardContent>
            
            {/* Fixed bottom buttons */}
            <div className="flex-shrink-0 flex justify-end space-x-2 p-6 pt-4 border-t bg-background">
              <Button 
                variant="outline" 
                onClick={() => setShowCaseSelection(false)}
              >
                取消
              </Button>
              <Button 
                onClick={handleUpdateSelectedCases}
                disabled={selectedCaseIds.length === 0 || updateSelectedCaseDetailsMutation.isPending}
              >
                {updateSelectedCaseDetailsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                更新选中案例 ({selectedCaseIds.length})
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
