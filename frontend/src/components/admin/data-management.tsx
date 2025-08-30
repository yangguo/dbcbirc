'use client'

import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { Download, Upload, RefreshCw, Database, AlertTriangle, FileText, List, Trash2 } from 'lucide-react'

interface CaseSummaryData {
  total_cases: number
  date_range?: {
    start: string
    end: string
  }
  summary?: string
}

interface CaseDetailsProgressData {
  org_name: string
  progress: {
    has_temp_data: boolean
    processed_cases: number
    temp_files: number
    latest_temp_file?: string
    last_modified?: number
    error?: string
  }
  timestamp: string
}

export function DataManagement() {
  const [updateForm, setUpdateForm] = useState({
    orgName: '银保监会机关',
    startPage: 1,
    endPage: 1,
  })

  const [isCleaningUp, setIsCleaningUp] = useState(false)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Query for active tasks
  const { data: activeTasksData } = useQuery({
    queryKey: ['active-tasks'],
    queryFn: () => apiClient.getActiveTasks(),
    // refetchInterval: 3000, // Disabled automatic refresh
  })

  // Query for case summary by organization
  const { data: caseSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['caseSummary', updateForm.orgName],
    queryFn: () => apiClient.getCaseSummaryByOrg(updateForm.orgName),
    // refetchInterval: 5000, // Disabled automatic refresh
  })

  // Query for case detail summary by organization
  const { data: caseDetailSummary, isLoading: detailSummaryLoading } = useQuery({
    queryKey: ['caseDetailSummary', updateForm.orgName],
    queryFn: () => apiClient.getCaseDetailSummaryByOrg(updateForm.orgName),
    // refetchInterval: 5000, // Disabled automatic refresh
  })

  const updateCasesMutation = useMutation({
    mutationFn: ({ orgName, startPage, endPage }: { orgName: string; startPage: number; endPage: number }) =>
      apiClient.updateCases(orgName, startPage, endPage),
    onSuccess: () => {
      toast({
        title: '更新任务已启动',
        description: '案例列表更新任务已在后台开始执行',
      })
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['caseSummary'] })
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: '启动案例列表更新任务失败，请重试',
        variant: 'destructive',
      })
    },
  })

  const updateCaseDetailsMutation = useMutation({
    mutationFn: (orgName: string) => apiClient.updateCaseDetails(orgName),
    onSuccess: () => {
      toast({
        title: '详情更新任务已启动',
        description: '案例详情更新任务已在后台开始执行',
      })
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['caseDetailSummary'] })
    },
    onError: (error) => {
      toast({
        title: '详情更新失败',
        description: '启动案例详情更新任务失败，请重试',
        variant: 'destructive',
      })
    },
  })

  // Query for case details progress
  const { data: caseDetailsProgress } = useQuery({
    queryKey: ['caseDetailsProgress', updateForm.orgName],
    queryFn: () => apiClient.getCaseDetailsProgress(updateForm.orgName),
    // refetchInterval: 2000, // Disabled automatic refresh
    enabled: updateCaseDetailsMutation.isPending, // Only fetch when updating
  })

  const refreshDataMutation = useMutation({
    mutationFn: () => apiClient.refreshData(),
    onSuccess: () => {
      toast({
        title: '数据刷新成功',
        description: '缓存数据已刷新',
      })
      queryClient.invalidateQueries()
    },
    onError: () => {
      toast({
        title: '刷新失败',
        description: '数据刷新失败，请重试',
        variant: 'destructive',
      })
    },
  })

  const handleCleanupTempFiles = async () => {
    setIsCleaningUp(true)
    try {
      await apiClient.cleanupTempFiles()
      toast({
        title: '清理成功',
        description: '临时文件已清理',
      })
    } catch (error) {
      toast({
        title: '清理失败',
        description: '清理临时文件失败，请重试',
        variant: 'destructive',
      })
    } finally {
      setIsCleaningUp(false)
    }
  }

  const handleUpdateCases = () => {
    updateCasesMutation.mutate({
      orgName: updateForm.orgName,
      startPage: updateForm.startPage,
      endPage: updateForm.endPage,
    })
  }

  const handleUpdateCaseDetails = () => {
    updateCaseDetailsMutation.mutate(updateForm.orgName)
  }

  const handleExportData = async () => {
    try {
      const blob = await apiClient.exportCasesCSV()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cbirc_cases_export.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: '导出成功',
        description: '数据已成功导出为CSV文件',
      })
    } catch (error) {
      toast({
        title: '导出失败',
        description: '数据导出失败，请重试',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              案例列表更新
            </CardTitle>
            <CardDescription>
              从CBIRC官网更新案例列表数据
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="orgName">机构类型</Label>
                <Select
                  value={updateForm.orgName}
                  onValueChange={(value) => setUpdateForm({ ...updateForm, orgName: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="银保监会机关">银保监会机关</SelectItem>
                    <SelectItem value="银保监局本级">银保监局本级</SelectItem>
                    <SelectItem value="银保监分局本级">银保监分局本级</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startPage">起始页</Label>
                  <Input
                    id="startPage"
                    type="number"
                    min="1"
                    value={updateForm.startPage}
                    onChange={(e) => setUpdateForm({ ...updateForm, startPage: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endPage">结束页</Label>
                  <Input
                    id="endPage"
                    type="number"
                    min="1"
                    value={updateForm.endPage}
                    onChange={(e) => setUpdateForm({ ...updateForm, endPage: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleUpdateCases}
              disabled={updateCasesMutation.isPending}
              className="w-full"
            >
              {updateCasesMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <List className="h-4 w-4 mr-2" />
              )}
              更新列表
            </Button>

            {/* Display case summary info */}
            {caseSummary && (
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>当前案例数：</span>
                  <Badge variant="outline">{(caseSummary as CaseSummaryData).total_cases}</Badge>
                </div>
                {(caseSummary as CaseSummaryData).date_range?.start && (
                  <div className="flex justify-between">
                    <span>日期范围：</span>
                    <span className="text-xs">{(caseSummary as CaseSummaryData).date_range.start} - {(caseSummary as CaseSummaryData).date_range.end}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              案例详情更新
            </CardTitle>
            <CardDescription>
              更新选定机构的案例详情数据
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>为 <strong>{updateForm.orgName}</strong> 更新案例详情信息。</p>
              <p className="mt-2">此操作将获取案例的完整内容、处罚决定等详细信息。</p>
              <p className="mt-2 text-amber-600">💡 提示：选择性案例更新功能已移至"案例管理"页面</p>
            </div>

            <Button 
              onClick={handleUpdateCaseDetails}
              disabled={updateCaseDetailsMutation.isPending}
              className="w-full"
            >
              {updateCaseDetailsMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              更新全部详情
            </Button>

            {/* Display progress information during updates */}
            {updateCaseDetailsMutation.isPending && caseDetailsProgress && (
              <div className="text-sm space-y-2 p-3 bg-blue-50 rounded-lg border">
                <div className="font-medium text-blue-900">更新进度</div>
                {(caseDetailsProgress as CaseDetailsProgressData).progress?.has_temp_data && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-blue-700">
                      <span>已处理案例：</span>
                      <Badge variant="secondary">{(caseDetailsProgress as CaseDetailsProgressData).progress.processed_cases}</Badge>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>临时文件：</span>
                      <Badge variant="outline">{(caseDetailsProgress as CaseDetailsProgressData).progress.temp_files}</Badge>
                    </div>
                    {(caseDetailsProgress as CaseDetailsProgressData).progress.latest_temp_file && (
                      <div className="text-xs text-blue-600">
                        最新文件: {(caseDetailsProgress as CaseDetailsProgressData).progress.latest_temp_file}
                      </div>
                    )}
                  </div>
                )}
                {!(caseDetailsProgress as CaseDetailsProgressData).progress?.has_temp_data && (
                  <div className="text-blue-700">正在准备更新...</div>
                )}
              </div>
            )}

            {/* Display case detail summary info */}
            {caseDetailSummary && (
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>详情案例数：</span>
                  <Badge variant="outline">{(caseDetailSummary as CaseSummaryData).total_cases}</Badge>
                </div>
                {(caseDetailSummary as CaseSummaryData).date_range?.start && (
                  <div className="flex justify-between">
                    <span>日期范围：</span>
                    <span className="text-xs">{(caseDetailSummary as CaseSummaryData).date_range.start} - {(caseDetailSummary as CaseSummaryData).date_range.end}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据导出</CardTitle>
            <CardDescription>
              导出当前系统中的案例数据
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                导出所有案例数据为CSV格式，包含案例详情、处罚金额、地区分布等信息。
              </p>
            </div>

            <Button onClick={handleExportData} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              导出CSV文件
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>数据维护</CardTitle>
            <CardDescription>
              系统数据的维护和管理操作
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => refreshDataMutation.mutate()}
              disabled={refreshDataMutation.isPending}
              variant="outline" 
              className="w-full"
            >
              {refreshDataMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              刷新数据缓存
            </Button>

            <Button variant="outline" className="w-full">
              <Database className="h-4 w-4 mr-2" />
              重建数据索引
            </Button>

            <Button variant="outline" className="w-full">
              <AlertTriangle className="h-4 w-4 mr-2" />
              数据完整性检查
            </Button>

            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleCleanupTempFiles}
              disabled={isCleaningUp}
            >
              {isCleaningUp ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              清理临时文件
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>更新状态</CardTitle>
            <CardDescription>
              实时监控更新任务进度
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(activeTasksData as any)?.tasks?.length > 0 ? (
                (activeTasksData as any).tasks.map((task: any) => (
                  <div key={task.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">
                        {task.type === 'cases' ? '案例列表' : '案例详情'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.org_name} - {task.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs">{task.progress}%</div>
                      <Badge variant={task.status === 'running' ? "secondary" : "default"}>
                        {task.status === 'running' ? "运行中" : 
                         task.status === 'pending' ? "待开始" : 
                         task.status === 'completed' ? "已完成" : "失败"}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">案例列表</div>
                      <div className="text-xs text-muted-foreground">{updateForm.orgName}</div>
                    </div>
                    <Badge variant={updateCasesMutation.isPending ? "secondary" : "default"}>
                      {updateCasesMutation.isPending ? "更新中" : "待更新"}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">案例详情</div>
                      <div className="text-xs text-muted-foreground">{updateForm.orgName}</div>
                    </div>
                    <Badge variant={updateCaseDetailsMutation.isPending ? "secondary" : "default"}>
                      {updateCaseDetailsMutation.isPending ? "更新中" : "待更新"}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">数据缓存</div>
                      <div className="text-xs text-muted-foreground">系统缓存</div>
                    </div>
                    <Badge variant={refreshDataMutation.isPending ? "secondary" : "default"}>
                      {refreshDataMutation.isPending ? "刷新中" : "正常"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}