'use client'

import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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
import { Download, Upload, FileText, Database, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface ExportTask {
  id: string
  type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  createdAt: string
  fileSize?: string
  downloadUrl?: string
}

interface ImportTask {
  id: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  processed: number
  total: number
  errors: string[]
  createdAt: string
}

export function CaseImportExport() {
  const [exportFormat, setExportFormat] = useState('csv')
  const [exportFilter, setExportFilter] = useState('all')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState(0)

  const { toast } = useToast()

  // Mock data for export/import tasks
  const exportTasks: ExportTask[] = [
    {
      id: 'exp-001',
      type: 'CSV导出',
      status: 'completed',
      progress: 100,
      createdAt: '2024-01-15 14:30',
      fileSize: '2.5 MB',
      downloadUrl: '/exports/cases_20240115.csv'
    },
    {
      id: 'exp-002',
      type: 'Excel导出',
      status: 'processing',
      progress: 65,
      createdAt: '2024-01-15 14:25',
    },
    {
      id: 'exp-003',
      type: 'JSON导出',
      status: 'failed',
      progress: 0,
      createdAt: '2024-01-15 14:20',
    }
  ]

  const importTasks: ImportTask[] = [
    {
      id: 'imp-001',
      fileName: 'new_cases_batch1.csv',
      status: 'completed',
      progress: 100,
      processed: 150,
      total: 150,
      errors: [],
      createdAt: '2024-01-15 13:45'
    },
    {
      id: 'imp-002',
      fileName: 'cases_update.xlsx',
      status: 'processing',
      progress: 45,
      processed: 67,
      total: 150,
      errors: [],
      createdAt: '2024-01-15 14:00'
    },
    {
      id: 'imp-003',
      fileName: 'invalid_format.txt',
      status: 'failed',
      progress: 0,
      processed: 0,
      total: 0,
      errors: ['文件格式不支持', '缺少必需字段'],
      createdAt: '2024-01-15 13:30'
    }
  ]

  const exportMutation = useMutation({
    mutationFn: () => apiClient.exportCasesCSV(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cbirc_cases_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: '导出成功',
        description: '案例数据已成功导出',
      })
    },
    onError: () => {
      toast({
        title: '导出失败',
        description: '数据导出失败，请重试',
        variant: 'destructive',
      })
    },
  })

  const handleExport = () => {
    exportMutation.mutate()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  const handleImport = () => {
    if (!importFile) {
      toast({
        title: '请选择文件',
        description: '请先选择要导入的文件',
        variant: 'destructive',
      })
      return
    }

    // TODO: Implement file import
    toast({
      title: '导入任务已启动',
      description: `正在导入文件: ${importFile.name}`,
    })
    
    // Simulate import progress
    setImportProgress(0)
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          toast({
            title: '导入完成',
            description: '文件导入成功',
          })
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">已完成</Badge>
      case 'failed':
        return <Badge variant="destructive">失败</Badge>
      case 'processing':
        return <Badge variant="secondary">处理中</Badge>
      default:
        return <Badge variant="outline">等待中</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              数据导出
            </CardTitle>
            <CardDescription>
              导出案例数据为各种格式
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="exportFormat">导出格式</Label>
                <Select
                  value={exportFormat}
                  onValueChange={setExportFormat}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV 格式</SelectItem>
                    <SelectItem value="excel">Excel 格式</SelectItem>
                    <SelectItem value="json">JSON 格式</SelectItem>
                    <SelectItem value="pdf">PDF 格式</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="exportFilter">导出范围</Label>
                <Select
                  value={exportFilter}
                  onValueChange={setExportFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部案例</SelectItem>
                    <SelectItem value="recent">最近一月</SelectItem>
                    <SelectItem value="categorized">已分类案例</SelectItem>
                    <SelectItem value="uncategorized">未分类案例</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleExport} 
                  disabled={exportMutation.isPending}
                  className="flex-1"
                >
                  {exportMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  开始导出
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>• CSV: 适合Excel和数据分析工具</p>
              <p>• Excel: 原生Excel格式，保留格式</p>
              <p>• JSON: 适合程序处理和API集成</p>
              <p>• PDF: 适合打印和报告</p>
            </div>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              数据导入
            </CardTitle>
            <CardDescription>
              从文件导入案例数据
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="importFile">选择文件</Label>
                <Input
                  id="importFile"
                  type="file"
                  accept=".csv,.xlsx,.json"
                  onChange={handleFileSelect}
                />
                {importFile && (
                  <p className="text-sm text-muted-foreground">
                    已选择: {importFile.name} ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {importProgress > 0 && (
                <div className="space-y-2">
                  <Label>导入进度</Label>
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    {importProgress}% 完成
                  </p>
                </div>
              )}

              <Button 
                onClick={handleImport} 
                disabled={!importFile || importProgress > 0}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                开始导入
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>• 支持 CSV, Excel, JSON 格式</p>
              <p>• 文件大小限制: 50MB</p>
              <p>• 请确保包含必需字段</p>
              <p>• 重复数据将被自动跳过</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            导出任务
          </CardTitle>
          <CardDescription>
            导出任务的状态和下载链接
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务ID</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>文件大小</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exportTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-sm">{task.id}</TableCell>
                  <TableCell>{task.type}</TableCell>
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
                  <TableCell className="text-sm">{task.createdAt}</TableCell>
                  <TableCell>{task.fileSize || '-'}</TableCell>
                  <TableCell>
                    {task.status === 'completed' && task.downloadUrl && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        下载
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Import Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            导入任务
          </CardTitle>
          <CardDescription>
            导入任务的状态和处理结果
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务ID</TableHead>
                <TableHead>文件名</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>处理情况</TableHead>
                <TableHead>错误</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-sm">{task.id}</TableCell>
                  <TableCell className="max-w-xs truncate">{task.fileName}</TableCell>
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
                    {task.total > 0 ? (
                      <span className="text-sm">
                        {task.processed} / {task.total}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {task.errors.length > 0 ? (
                      <Badge variant="destructive">
                        {task.errors.length} 个错误
                      </Badge>
                    ) : (
                      <Badge variant="outline">无错误</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{task.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* File Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle>文件格式说明</CardTitle>
          <CardDescription>
            导入文件的格式要求和字段说明
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">必需字段</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <code>title</code> - 案例标题</li>
                <li>• <code>subtitle</code> - 文号</li>
                <li>• <code>publish_date</code> - 发布日期 (YYYY-MM-DD)</li>
                <li>• <code>content</code> - 案例内容</li>
                <li>• <code>id</code> - 唯一标识符</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">可选字段</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <code>category</code> - 案例分类</li>
                <li>• <code>amount</code> - 处罚金额</li>
                <li>• <code>province</code> - 处罚地区</li>
                <li>• <code>industry</code> - 行业类型</li>
                <li>• <code>people</code> - 被处罚当事人</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
