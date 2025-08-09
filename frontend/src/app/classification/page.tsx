'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Tag, 
  Cpu, 
  Upload, 
  Download,
  FileText,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader2,
  Table as TableIcon,
  Code
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ClassificationStats {
  total_cases: number
  categorized_cases: number
  uncategorized_cases: number
  categories: Record<string, number>
  monthly_stats: Record<string, { total: number; categorized: number }>
}

interface ClassificationData {
  id: string
  title: string
  content: string
  publishDate: string
  predicted_labels?: string[]
  confidence?: number
}

export default function ClassificationPage() {
  const [activeTab, setActiveTab] = useState('generate')
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  const [selectableData, setSelectableData] = useState<any[]>([])
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(new Set())
  const [selectAll, setSelectAll] = useState(true)
  const [previewLimit, setPreviewLimit] = useState<string>('50')
  const [selectedIdColumn, setSelectedIdColumn] = useState<string>('')
  const [selectedContentColumn, setSelectedContentColumn] = useState<string>('')
  const [showColumnSelection, setShowColumnSelection] = useState(false)
  const [classificationData, setClassificationData] = useState<ClassificationData[]>([])
  const [stats, setStats] = useState<ClassificationStats>({
    total_cases: 0,
    categorized_cases: 0,
    uncategorized_cases: 0,
    categories: {},
    monthly_stats: {}
  })
  const [textInput, setTextInput] = useState('')
  const [extractResult, setExtractResult] = useState<any>(null)
  const [displayMode, setDisplayMode] = useState<'json' | 'table'>('json')
  const [downloadLimit, setDownloadLimit] = useState<string>('all') // 'all', 'custom', or specific numbers
  const [batchResults, setBatchResults] = useState<any[]>([])  
  const [processingLogs, setProcessingLogs] = useState<string[]>([])  
  const [showResults, setShowResults] = useState(false)
  const [realTimeProgress, setRealTimeProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    currentRecordId?: string;
    isProcessing: boolean;
  }>({ current: 0, total: 0, percentage: 0, isProcessing: false })
  const [realTimeLogs, setRealTimeLogs] = useState<string[]>([])
  const [tempFile, setTempFile] = useState<File | null>(null)
  const [tempFileProcessing, setTempFileProcessing] = useState(false)

  // 获取分类统计数据
  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await apiClient.getClassificationStats() as ClassificationStats
      setStats(data)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  // 生成待标签案例
  const handleGenerateLabels = async () => {
    setProcessing(true)
    try {
      // Prepare the URL with limit parameter if needed
      let url = 'http://localhost:8000/api/v1/admin/generate-classification-data'
      if (downloadLimit !== 'all') {
        const limitValue = downloadLimit === 'custom' ? 1000 : parseInt(downloadLimit) // default to 1000 for custom
        url += `?limit=${limitValue}`
      }
      
      const response = await fetch(url, {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        setClassificationData(data.data || [])
        setStats({
          total_cases: data.total_cases || 0,
          categorized_cases: data.categorized_cases || 0,
          uncategorized_cases: data.uncategorized_cases || 0,
          categories: data.categories || {},
          monthly_stats: data.monthly_stats || {}
        })
        toast({
          title: '成功',
          description: downloadLimit === 'all' 
            ? `成功生成全部 ${data.data?.length || 0} 条待分类案例`
            : `成功生成前 ${data.data?.length || 0} 条待分类案例 (限制: ${downloadLimit} 条)`,
        })
      } else {
        toast({
          title: '错误',
          description: '生成失败,请稍后重试',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('生成分类数据失败:', error)
      toast({
        title: '错误',
        description: '生成失败,请检查网络连接',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  // 下载批量提取结果为CSV
  const downloadBatchResults = () => {
    if (batchResults.length === 0) {
      toast({
        title: '错误',
        description: '没有可下载的结果',
        variant: 'destructive',
      })
      return
    }

    // 创建CSV内容
    const headers = [
      '原始ID', '状态', '行政处罚决定书文号', '被处罚当事人', '主要违法违规事实',
      '行政处罚依据', '行政处罚决定', '作出处罚决定的机关名称', '作出处罚决定的日期',
      '行业', '罚没总金额', '违规类型', '监管地区'
    ]
    
    const csvContent = [
      headers.join(','),
      ...batchResults.map(row => {
        return headers.map(header => {
          let value = row[header] || ''
          
          // 特殊处理罚没总金额字段,确保为纯数字
          if (header === '罚没总金额' && value && value !== '0') {
            // 如果值是字符串且包含数字,提取数字部分
            const numericValue = typeof value === 'string' ? value.replace(/[^0-9.]/g, '') : value
            value = numericValue || '0'
          }
          
          // 处理包含逗号或引号的值
          if (value.toString().includes(',') || value.toString().includes('"')) {
            return `"${value.toString().replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      })
    ].join('\n')

    // 下载文件
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'penalty_extraction_results.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast({
      title: '成功',
      description: '结果文件已下载',
    })
  }

  // 保存成功记录为两个文件
  const downloadSuccessfulRecords = async () => {
    const successfulRecords = batchResults.filter(record => record.状态 === '成功')
    
    if (successfulRecords.length === 0) {
      toast({
        title: '错误',
        description: '没有成功的记录可保存',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/v1/classification/save-successful-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results: batchResults
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '保存失败')
      }
      
      const result = await response.json()
      toast({
        title: '成功',
        description: `成功保存 ${result.successful_count} 条记录到 cbirc/ 目录下的以下文件:\n${result.files_created.map(file => file.filename).join('\n')}`,
      })
      
    } catch (error) {
      console.error('保存失败:', error)
      toast({
        title: '错误',
        description: `保存失败: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  // 处理临时文件上传
  const handleTempFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: '错误',
          description: '文件大小不能超过 10MB',
          variant: 'destructive',
        })
        return
      }
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: '错误',
          description: '请上传 CSV 或 Excel 格式文件',
          variant: 'destructive',
        })
        return
      }
      setTempFile(file)
      toast({
        title: '成功',
        description: `文件 ${file.name} 已选择`,
      })
    }
  }

  // 上传并处理临时文件
  const handleUploadTempFile = async () => {
    if (!tempFile) {
      toast({
        title: '错误',
        description: '请先选择文件',
        variant: 'destructive',
      })
      return
    }

    setTempFileProcessing(true)
    
    const formData = new FormData()
    formData.append('file', tempFile)

    try {
      const response = await fetch('http://localhost:8000/api/v1/classification/upload-temp-extraction-file', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '上传失败')
      }
      
      const result = await response.json()
      toast({
        title: '上传成功',
        description: `成功处理 ${result.successful_records} 条记录，已保存为:\n${result.files_created.map(file => file.filename).join('\n')}`,
      })
      
      // 清空文件选择
      setTempFile(null)
      const fileInput = document.getElementById('temp-file-upload') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
      
    } catch (error) {
      console.error('上传失败:', error)
      toast({
        title: '错误',
        description: `上传失败: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setTempFileProcessing(false)
    }
  }

  // 处罚信息提取
  const handleExtractPenaltyInfo = async () => {
    if (!textInput.trim()) {
      toast({
        title: '错误',
        description: '请输入要提取的文本',
        variant: 'destructive',
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/classification/extract-penalty-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: textInput
        })
      })

      if (response.ok) {
        const result = await response.json()
        setExtractResult(result)
        toast({
          title: '成功',
          description: '信息提取完成',
        })
      } else {
        toast({
          title: '错误',
          description: '信息提取失败,请稍后重试',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('信息提取失败:', error)
      toast({
        title: '错误',
        description: '信息提取失败,请检查网络连接',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  // 文件上传处理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: '错误',
          description: '文件大小不能超过 10MB',
          variant: 'destructive',
        })
        return
      }
      if (!file.name.endsWith('.csv')) {
        toast({
          title: '错误',
          description: '请上传 CSV 格式文件',
          variant: 'destructive',
        })
        return
      }
      setUploadedFile(file)
      
      // 获取文件列信息
      const formData = new FormData()
      formData.append('file', file)
      formData.append('preview_limit', previewLimit)
      
      try {
        const response = await fetch('http://localhost:8000/api/v1/classification/get-file-columns', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const result = await response.json()
          setFileColumns(result.columns)
          setPreviewData(result.preview_data)
          setSelectableData(result.preview_data)
          // 默认全选
          const initialIds = new Set<string | number>()
          const idKey = result.columns.find((c: string) => ['id','ID','序号','编号','index'].some(k => c.toLowerCase().includes(k.toLowerCase()))) || result.columns[0]
          result.preview_data.forEach((row: any, idx: number) => {
            const key = row[idKey] ?? idx
            initialIds.add(key)
          })
          setSelectedRowIds(initialIds)
          setSelectAll(true)
          setShowColumnSelection(true)
          
          // 自动选择可能的ID和内容列
          const idCandidates = ['id', 'ID', '序号', '编号', 'index']
          const contentCandidates = ['content', 'text', '内容', '文本', '正文', 'doc1']
          
          const idColumn = result.columns.find((col: string) => 
            idCandidates.some(candidate => col.toLowerCase().includes(candidate.toLowerCase()))
          ) || result.columns[0]
          
          const contentColumn = result.columns.find((col: string) => 
            contentCandidates.some(candidate => col.toLowerCase().includes(candidate.toLowerCase()))
          ) || result.columns[1] || result.columns[0]
          
          setSelectedIdColumn(idColumn)
          setSelectedContentColumn(contentColumn)
          
          toast({
            title: '成功',
            description: `文件上传成功,共 ${result.total_rows} 行数据`,
          })
        } else {
          toast({
            title: '错误',
            description: '无法读取文件列信息',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('获取文件列信息失败:', error)
        toast({
          title: '错误',
          description: '获取文件列信息失败',
          variant: 'destructive',
        })
      }
    }
  }

  // 基于已上传文件与当前预览数量设置，刷新预览
  const refreshPreview = async () => {
    if (!uploadedFile) return
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('preview_limit', previewLimit)

      const response = await fetch('http://localhost:8000/api/v1/classification/get-file-columns', {
        method: 'POST',
        body: formData
      })
      if (!response.ok) throw new Error('无法读取文件列信息')

      const result = await response.json()
      setFileColumns(result.columns)
      setPreviewData(result.preview_data)
      setSelectableData(result.preview_data)

      // 预览刷新后默认全选
      const initialIds = new Set<string | number>()
      const idKey = result.columns.find((c: string) => ['id','ID','序号','编号','index'].some(k => c.toLowerCase().includes(k.toLowerCase()))) || result.columns[0]
      result.preview_data.forEach((row: any, idx: number) => {
        const key = row[idKey] ?? idx
        initialIds.add(key)
      })
      setSelectedRowIds(initialIds)
      setSelectAll(true)
    } catch (e) {
      toast({ title: '错误', description: '刷新预览失败', variant: 'destructive' })
    }
  }

  // 批量处罚信息提取 - 实时版本
  const handleBatchExtractRealTime = async () => {
    if (!uploadedFile) {
      toast({
        title: '错误',
        description: '请先上传文件',
        variant: 'destructive',
      })
      return
    }

    if (!selectedIdColumn || !selectedContentColumn) {
      toast({
        title: '错误',
        description: '请选择ID字段和内容字段',
        variant: 'destructive',
      })
      return
    }

    setProcessing(true)
    setBatchResults([])
    setProcessingLogs([])
    setRealTimeLogs([])
    setShowResults(false)
    setRealTimeProgress({ current: 0, total: 0, percentage: 0, isProcessing: true })
    
    const formData = new FormData()
    formData.append('file', uploadedFile)
    formData.append('id_column', selectedIdColumn)
    formData.append('content_column', selectedContentColumn)
    // 发送选择的记录索引（基于预览顺序）或ID列表
    try {
      const selectedIdsArray = Array.from(selectedRowIds)
      formData.append('selected_ids', JSON.stringify(selectedIdsArray))
    } catch {}

    try {
      const response = await fetch('http://localhost:8000/api/v1/classification/batch-extract-penalty-info-stream', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('网络请求失败')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              // 处理不同类型的消息
              switch (data.type) {
                case 'start':
                  setRealTimeLogs(prev => [...prev, data.message, data.file_info, data.task_info])
                  setRealTimeProgress(prev => ({ ...prev, total: data.total_records }))
                  break
                  
                case 'progress':
                  setRealTimeProgress({
                    current: data.current,
                    total: data.total,
                    percentage: data.percentage,
                    currentRecordId: data.record_id,
                    isProcessing: true
                  })
                  setRealTimeLogs(prev => [...prev, data.message])
                  break
                  
                case 'success':
                case 'failure':
                  setRealTimeLogs(prev => [...prev, data.message])
                  break
                  
                case 'temp_save':
                case 'temp_save_error':
                  setRealTimeLogs(prev => [...prev, data.message])
                  break
                  
                case 'complete':
                  setBatchResults(data.results || [])
                  setProcessingLogs(prev => [...prev, ...realTimeLogs])
                  setShowResults(true)
                  setRealTimeProgress(prev => ({ ...prev, isProcessing: false }))
                  
                  const successMsg = [
                    `处理完成: ${data.processed_count || 0} 条记录`,
                    `成功提取: ${data.extracted_count || 0} 条结果`,
                    `成功率: ${data.success_rate || 0}%`,
                    `处理时间: ${data.processing_time_minutes || 0} 分钟`,
                    `提取到 ${data.total_penalty_records || 0} 条处罚信息`
                  ].join(' | ')
                  
                  toast({
                    title: '批量提取完成',
                    description: successMsg,
                  })
                  break
                  
                case 'error':
                  throw new Error(data.message)
              }
            } catch (parseError) {
              console.error('解析服务器响应失败:', parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('批量提取失败:', error)
      setRealTimeProgress(prev => ({ ...prev, isProcessing: false }))
      toast({
        title: '错误',
        description: error instanceof Error ? error.message : '批量提取失败,请检查网络连接',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  // 批量处罚信息提取 - 原版本（保留作为备用）
  const handleBatchExtract = async () => {
    if (!uploadedFile) {
      toast({
        title: '错误',
        description: '请先上传文件',
        variant: 'destructive',
      })
      return
    }

    if (!selectedIdColumn || !selectedContentColumn) {
      toast({
        title: '错误',
        description: '请选择ID字段和内容字段',
        variant: 'destructive',
      })
      return
    }

    setProcessing(true)
    setBatchResults([])
    setProcessingLogs([])
    setShowResults(false)
    
    const formData = new FormData()
    formData.append('file', uploadedFile)
    formData.append('id_column', selectedIdColumn)
    formData.append('content_column', selectedContentColumn)

    try {
      const response = await fetch('http://localhost:8000/api/v1/classification/batch-extract-penalty-info', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setBatchResults(result.results || [])
        setProcessingLogs(result.processing_logs || [])
        setShowResults(true)
        
        // 构建详细的成功消息
        const successMsg = [
          `处理完成: ${result.processed_count || 0} 条记录`,
          `成功提取: ${result.extracted_count || 0} 条结果`,
          `成功率: ${result.success_rate || 0}%`,
          `处理时间: ${result.processing_time_minutes || 0} 分钟`,
          `提取到 ${result.total_penalty_records || 0} 条处罚信息`
        ].join(' | ')
        
        toast({
          title: '批量提取完成',
          description: successMsg,
        })
      } else {
        const errorData = await response.json()
        toast({
          title: '错误',
          description: errorData.detail || '批量提取失败,请稍后重试',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('批量提取失败:', error)
      toast({
        title: '错误',
        description: '批量提取失败,请检查网络连接',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  // 下载待分类数据
  const downloadClassificationData = () => {
    if (classificationData.length === 0) {
      toast({
        title: '错误',
        description: '没有可下载的数据',
        variant: 'destructive',
      })
      return
    }

    // Show info about the download
    toast({
      title: '下载开始',
      description: `正在下载 ${classificationData.length} 条待分类案例数据`,
    })

    const csvContent = [
      'ID,标题,发布日期,内容',
      ...classificationData.map(item => 
        `"${item.id}","${item.title}","${item.publishDate}","${item.content.replace(/"/g, '""')}"`
      )
    ].join('\n')

    // 添加 BOM 以确保中文字符正确显示
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const limitLabel = downloadLimit === 'all' ? 'all' : `top${downloadLimit}`
    a.download = `cbirc_待分类案例_${limitLabel}_${classificationData.length}条_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    // Success notification
    toast({
      title: '下载完成',
      description: `已成功下载 ${classificationData.length} 条案例数据到 CSV 文件`,
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">案例分类</h1>
        <p className="text-muted-foreground">
          AI驱动的案例自动分类和标签生成系统
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总案例数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_cases.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">数据库中的案例总数</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分类完成率</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_cases > 0 ? Math.round((stats.categorized_cases / stats.total_cases) * 100) : 0}%
            </div>
            <Progress 
              value={stats.total_cases > 0 ? (stats.categorized_cases / stats.total_cases) * 100 : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已分类案例</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.categorized_cases.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">已完成分类的案例</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待分类案例</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.uncategorized_cases.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">需要处理的案例</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            生成待标签案例
          </TabsTrigger>
          <TabsTrigger value="classify" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            处罚信息提取
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            批量提取
          </TabsTrigger>
          <TabsTrigger value="upload-temp" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            上传临时文件
          </TabsTrigger>
        </TabsList>

        {/* Generate Labels Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                生成待标签案例
              </CardTitle>
              <CardDescription>
                系统将自动识别需要标签的案例,并生成待处理列表
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Download Limit Selection */}
              <div className="space-y-2">
                <Label htmlFor="downloadLimit">下载数量限制</Label>
                <Select value={downloadLimit} onValueChange={setDownloadLimit}>
                  <SelectTrigger className="w-full max-w-md mx-auto">
                    <SelectValue placeholder="选择下载数量" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部案例 (推荐)</SelectItem>
                    <SelectItem value="50">前 50 条 - 快速预览</SelectItem>
                    <SelectItem value="100">前 100 条 - 小批量</SelectItem>
                    <SelectItem value="500">前 500 条 - 中等批量</SelectItem>
                    <SelectItem value="1000">前 1000 条 - 大批量</SelectItem>
                    <SelectItem value="2000">前 2000 条 - 超大批量</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground text-center">
                  选择要生成和下载的案例数量。"全部案例"将处理所有可用的待分类案例,<br />
                  限制数量选项适用于快速预览或分批处理大量案例。
                </p>
              </div>

              {/* Current Configuration Status */}
              {stats.uncategorized_cases > 0 && (
                <div className="bg-muted/30 border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Tag className="h-4 w-4" />
                    <span className="text-sm font-medium">当前配置</span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    系统中有 <strong>{stats.uncategorized_cases}</strong> 条待分类案例。
                    {downloadLimit === 'all' 
                      ? ' 将生成并下载全部案例。'
                      : ` 将生成并下载前 ${downloadLimit} 条案例。`
                    }
                  </div>
                </div>
              )}

              <div className="text-center">
                <Button 
                  onClick={handleGenerateLabels}
                  disabled={processing}
                  size="lg"
                  className="w-full max-w-md"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Tag className="mr-2 h-4 w-4" />
                      生成待分类案例
                    </>
                  )}
                </Button>
              </div>

              {processing && (
                <Card className="bg-muted/30 border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-900">正在处理案例数据</div>
                        <div className="text-sm text-blue-700">预计需要 2-3 分钟完成</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {classificationData.length > 0 && !processing && (
                <Card className="bg-green-50/50 border-green-200/50">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="font-medium text-green-900">数据生成完成</div>
                      </div>
                      <div className="text-sm text-green-700">
                        {downloadLimit === 'all' 
                          ? `共找到 ${stats.uncategorized_cases} 条待分类案例,已生成全部 ${classificationData.length} 条案例用于下载`
                          : `共找到 ${stats.uncategorized_cases} 条待分类案例,已生成前 ${classificationData.length} 条案例用于下载`
                        }
                        <br />
                        已分类案例: {stats.categorized_cases} 条
                      </div>
                      <Button 
                        onClick={downloadClassificationData}
                        variant="outline"
                        size="sm"
                        className="border-green-300 text-green-700 hover:bg-green-100/50"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        下载待分类数据 ({classificationData.length} 条) (CSV)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Penalty Info Extraction Tab */}
        <TabsContent value="classify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                处罚信息提取
              </CardTitle>
              <CardDescription>
                输入处罚决定书文本,自动提取关键信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-input">输入文本</Label>
                <Textarea
                  id="text-input"
                  placeholder="请输入行政处罚决定书文本..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[200px] max-h-[400px] resize-y"
                  maxLength={10000}
                />
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                  <span>支持最多10,000个字符</span>
                  <span className={textInput.length > 9000 ? "text-orange-500" : textInput.length > 9500 ? "text-red-500" : ""}>
                    {textInput.length}/10,000
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleExtractPenaltyInfo}
                disabled={processing || !textInput.trim()}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    提取中...
                  </>
                ) : (
                  <>
                    <Cpu className="mr-2 h-4 w-4" />
                    提取信息
                  </>
                )}
              </Button>

              {extractResult && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">提取结果</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant={displayMode === 'json' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDisplayMode('json')}
                          className="flex items-center gap-1"
                        >
                          <Code className="h-4 w-4" />
                          JSON
                        </Button>
                        <Button
                          variant={displayMode === 'table' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDisplayMode('table')}
                          className="flex items-center gap-1"
                        >
                          <TableIcon className="h-4 w-4" />
                          表格
                        </Button>
                        {displayMode === 'table' && Array.isArray(extractResult.data) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Convert table data to CSV and download
                              // 使用与批量提取一致的字段顺序
                              const headers = [
                                '行政处罚决定书文号', '被处罚当事人', '主要违法违规事实',
                                '行政处罚依据', '行政处罚决定', '作出处罚决定的机关名称', '作出处罚决定的日期',
                                '行业', '罚没总金额', '违规类型', '监管地区'
                              ];
                              const csvData = [
                                headers.join(','),
                                ...extractResult.data.map((record: any) => [
                                  `"${record.行政处罚决定书文号 || ''}"`,
                                  `"${record.被处罚当事人 || ''}"`,
                                  `"${record.主要违法违规事实 || ''}"`,
                                  `"${record.行政处罚依据 || ''}"`,
                                  `"${record.行政处罚决定 || ''}"`,
                                  `"${record.作出处罚决定的机关名称 || ''}"`,
                                  `"${record.作出处罚决定的日期 || ''}"`,
                                  `"${record.行业 || ''}"`,
                                  record.罚没总金额 || '',
                                  `"${record.违规类型 || ''}"`,
                                  `"${record.监管地区 || ''}"`
                                ].join(','))
                              ].join('\n');
                              
                              const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `penalty_extraction_${new Date().toISOString().split('T')[0]}.csv`;
                              a.click();
                              window.URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            导出CSV
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!extractResult.success && extractResult.error && (
                      <div className="text-red-600 bg-red-50/50 p-3 rounded border mb-4">
                        错误: {extractResult.error}
                      </div>
                    )}
                    
                    {extractResult.success && extractResult.data && (
                      <div className="space-y-4">
                        {/* Summary Section for Table Mode */}
                        {displayMode === 'table' && Array.isArray(extractResult.data) && (
                          <div className="bg-muted/30 p-4 rounded-lg border">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">记录数量:</span>
                                <span className="ml-2 font-semibold">{extractResult.data.length}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">总罚没金额:</span>
                                <span className="ml-2 font-semibold text-destructive">
                                  {extractResult.data.reduce((total: number, record: any) => {
                                    const amount = parseInt(record.罚没总金额 || '0');
                                    return total + amount;
                                  }, 0) > 0 
                                    ? `${(extractResult.data.reduce((total: number, record: any) => {
                                        const amount = parseInt(record.罚没总金额 || '0');
                                        return total + amount;
                                      }, 0) / 10000).toLocaleString()}万元`
                                    : '未统计'
                                  }
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">涉及行业:</span>
                                <span className="ml-2 font-semibold">
                                  {Array.from(new Set(extractResult.data.map((record: any) => record.行业).filter(Boolean))).length || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">监管机关:</span>
                                <span className="ml-2 font-semibold">
                                  {Array.from(new Set(extractResult.data.map((record: any) => record.作出处罚决定的机关名称).filter(Boolean))).length || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {displayMode === 'json' && (
                          <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto">
                            <pre>{JSON.stringify(extractResult.data, null, 2)}</pre>
                          </div>
                        )}
                        
                        {displayMode === 'table' && (
                          <div className="border rounded-lg overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="min-w-[100px]">行政处罚决定书文号</TableHead>
                                  <TableHead className="min-w-[120px]">被处罚当事人</TableHead>
                                  <TableHead className="min-w-[200px]">主要违法违规事实</TableHead>
                                  <TableHead className="min-w-[120px]">行政处罚依据</TableHead>
                                  <TableHead className="min-w-[150px]">行政处罚决定</TableHead>
                                  <TableHead className="min-w-[120px]">作出处罚决定的机关名称</TableHead>
                                  <TableHead className="min-w-[80px]">作出处罚决定的日期</TableHead>
                                  <TableHead className="min-w-[80px]">行业</TableHead>
                                  <TableHead className="min-w-[100px]">罚没总金额</TableHead>
                                  <TableHead className="min-w-[80px]">违规类型</TableHead>
                                  <TableHead className="min-w-[80px]">监管地区</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Array.isArray(extractResult.data) ? extractResult.data.map((record: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <div className="break-words max-w-[100px] text-xs">
                                        {record.行政处罚决定书文号 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      <div className="break-words max-w-[120px]">
                                        {record.被处罚当事人 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[200px] text-xs">
                                        {record.主要违法违规事实 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[120px] text-xs">
                                        {record.行政处罚依据 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[150px] text-xs">
                                        {record.行政处罚决定 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[120px] text-xs">
                                        {record.作出处罚决定的机关名称 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-xs">
                                        {record.作出处罚决定的日期 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">
                                        {record.行业 || '-'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-right">
                                        {record.罚没总金额 && record.罚没总金额 !== '0' 
                                          ? parseInt(record.罚没总金额).toLocaleString()
                                          : '-'
                                        }
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[80px] text-xs">
                                        {record.违规类型 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[80px] text-xs">
                                        {record.监管地区 || '-'}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )) : (
                                  <TableRow>
                                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                                      数据格式错误或无数据
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        
                        {extractResult.confidence && (
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">置信度:</span>
                            <Badge variant="outline">
                              {(extractResult.confidence * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Penalty Info Extraction Tab */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                批量处罚信息提取
              </CardTitle>
              <CardDescription>
                上传CSV或Excel文件进行批量处罚信息提取
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">上传文件</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="text-sm text-muted-foreground mb-2">
                    点击上传或拖拽文件到此处
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">
                    支持 CSV 和 Excel 格式文件,最大 10MB
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    选择文件
                  </Button>
                  {uploadedFile && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      已选择: {uploadedFile.name}
                    </div>
                  )}
                </div>
              </div>

              {/* 字段选择和数据预览 */}
              {showColumnSelection && fileColumns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">字段与数据选择</CardTitle>
                    <CardDescription>
                      请选择ID字段、内容字段，并在下方预览中勾选要提取的记录（默认全选）
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="id-column">ID字段</Label>
                        <Select value={selectedIdColumn} onValueChange={setSelectedIdColumn}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择ID字段" />
                          </SelectTrigger>
                          <SelectContent>
                            {fileColumns.map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content-column">内容字段</Label>
                        <Select value={selectedContentColumn} onValueChange={setSelectedContentColumn}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择内容字段" />
                          </SelectTrigger>
                          <SelectContent>
                            {fileColumns.map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 数据预览 */}
                    {previewData.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Label>数据预览与选择</Label>
                          <div className="flex items-center gap-3 text-sm">
                            <label className="flex items-center gap-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={(e) => {
                                  const checked = e.target.checked
                                  setSelectAll(checked)
                                  if (checked) {
                                    const allIds = new Set<string | number>()
                                    const idKey = selectedIdColumn || fileColumns[0]
                                    selectableData.forEach((row, idx) => {
                                      const key = row[idKey] ?? idx
                                      allIds.add(key)
                                    })
                                    setSelectedRowIds(allIds)
                                  } else {
                                    setSelectedRowIds(new Set())
                                  }
                                }}
                              />
                              全选
                            </label>
                            <span className="text-muted-foreground">已选 {selectedRowIds.size} / {selectableData.length}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">预览数量</span>
                              <Select value={previewLimit} onValueChange={setPreviewLimit}>
                                <SelectTrigger className="h-8 w-28">
                                  <SelectValue placeholder="数量" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="50">50</SelectItem>
                                  <SelectItem value="100">100</SelectItem>
                                  <SelectItem value="200">200</SelectItem>
                                  <SelectItem value="500">500</SelectItem>
                                  <SelectItem value="all">全部</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="outline" onClick={refreshPreview}>更新预览</Button>
                            </div>
                          </div>
                        </div>
                        <div className="border rounded-lg overflow-auto max-h-80">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">
                                  <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={(e) => {
                                      const checked = e.target.checked
                                      setSelectAll(checked)
                                      if (checked) {
                                        const allIds = new Set<string | number>()
                                        const idKey = selectedIdColumn || fileColumns[0]
                                        selectableData.forEach((row, idx) => {
                                          const key = row[idKey] ?? idx
                                          allIds.add(key)
                                        })
                                        setSelectedRowIds(allIds)
                                      } else {
                                        setSelectedRowIds(new Set())
                                      }
                                    }}
                                  />
                                </TableHead>
                                {fileColumns.map((column) => (
                                  <TableHead key={column} className="min-w-[120px]">
                                    {column}
                                    {column === selectedIdColumn && (
                                      <Badge variant="secondary" className="ml-2 text-xs">
                                        ID
                                      </Badge>
                                    )}
                                    {column === selectedContentColumn && (
                                      <Badge variant="secondary" className="ml-2 text-xs">
                                        内容
                                      </Badge>
                                    )}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectableData.map((row, index) => {
                                const idKey = selectedIdColumn || fileColumns[0]
                                const rowId = row[idKey] ?? index
                                const checked = selectedRowIds.has(rowId)
                                return (
                                  <TableRow key={index} className={checked ? 'bg-muted/30' : ''}>
                                    <TableCell>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          const next = new Set(selectedRowIds)
                                          if (e.target.checked) {
                                            next.add(rowId)
                                          } else {
                                            next.delete(rowId)
                                          }
                                          setSelectedRowIds(next)
                                          setSelectAll(next.size === selectableData.length)
                                        }}
                                      />
                                    </TableCell>
                                    {fileColumns.map((column) => (
                                      <TableCell key={column} className="max-w-[200px] truncate">
                                        {String(row[column] ?? '')}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button 
                  onClick={handleBatchExtractRealTime}
                  disabled={processing || !uploadedFile || !selectedIdColumn || !selectedContentColumn}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      批量提取
                    </>
                  )}
                </Button>
            </CardContent>
          </Card>

          {/* 实时进度显示区域 */}
          {realTimeProgress.isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  实时处理进度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 进度条 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>处理进度: {realTimeProgress.current}/{realTimeProgress.total}</span>
                      <span>{realTimeProgress.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${realTimeProgress.percentage}%` }}
                      ></div>
                    </div>
                    {realTimeProgress.currentRecordId && (
                      <div className="text-sm text-gray-600">
                        当前处理记录ID: {realTimeProgress.currentRecordId}
                      </div>
                    )}
                  </div>
                  
                  {/* 实时日志 */}
                  <div className="space-y-2">
                    <h4 className="font-medium">实时日志</h4>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                      {realTimeLogs.map((log, index) => (
                        <div 
                          key={index} 
                          className={`text-sm mb-1 ${
                            log && log.includes('✓') ? 'text-green-600' : 
                            log && (log.includes('✗') || log.includes('失败')) ? 'text-red-600' : 
                            log && log.includes('💾') ? 'text-blue-600' : 
                            'text-gray-700'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 处理统计概览 */}
          {showResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  处理统计概览
                </CardTitle>
                <CardDescription>
                  批量处理任务的详细统计信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">{batchResults.length}</div>
                    <div className="text-sm text-blue-600/70">总记录数</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">
                      {batchResults.filter(r => r.状态 === '成功').length}
                    </div>
                    <div className="text-sm text-green-600/70">成功提取</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-red-600">
                      {batchResults.filter(r => r.状态 === '失败').length}
                    </div>
                    <div className="text-sm text-red-600/70">提取失败</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">
                      {batchResults.length > 0 ? 
                        Math.round((batchResults.filter(r => r.状态 === '成功').length / batchResults.length) * 100) : 0}%
                    </div>
                    <div className="text-sm text-purple-600/70">成功率</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 批量提取结果 */}
          {showResults && batchResults.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TableIcon className="h-5 w-5" />
                      提取结果
                    </CardTitle>
                    <CardDescription>
                      共 {batchResults.length} 条结果,成功 {batchResults.filter(r => r.状态 === '成功').length} 条,失败 {batchResults.filter(r => r.状态 === '失败').length} 条
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={downloadBatchResults} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      下载CSV
                    </Button>
                    <Button onClick={downloadSuccessfulRecords} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      保存成功记录
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">原始ID</TableHead>
                        <TableHead className="min-w-[60px]">状态</TableHead>
                        <TableHead className="min-w-[100px]">行政处罚决定书文号</TableHead>
                        <TableHead className="min-w-[120px]">被处罚当事人</TableHead>
                        <TableHead className="min-w-[200px]">主要违法违规事实</TableHead>
                        <TableHead className="min-w-[120px]">行政处罚依据</TableHead>
                        <TableHead className="min-w-[150px]">行政处罚决定</TableHead>
                        <TableHead className="min-w-[120px]">作出处罚决定的机关名称</TableHead>
                        <TableHead className="min-w-[80px]">作出处罚决定的日期</TableHead>
                        <TableHead className="min-w-[80px]">行业</TableHead>
                        <TableHead className="min-w-[100px]">罚没总金额</TableHead>
                        <TableHead className="min-w-[80px]">违规类型</TableHead>
                        <TableHead className="min-w-[80px]">监管地区</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchResults.map((record: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {record.原始ID || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.状态 === '成功' ? 'default' : 'destructive'}>
                              {record.状态}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[100px] text-xs">
                              {record.行政处罚决定书文号 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[120px]">
                              {record.被处罚当事人 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[200px] text-xs">
                              {record.主要违法违规事实 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[120px] text-xs">
                              {record.行政处罚依据 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[150px] text-xs">
                              {record.行政处罚决定 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[120px] text-xs">
                              {record.作出处罚决定的机关名称 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {record.作出处罚决定的日期 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {record.行业 || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-right">
                              {record.罚没总金额 && record.罚没总金额 !== '0' 
                                ? parseInt(record.罚没总金额).toLocaleString()
                                : '-'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[80px] text-xs">
                              {record.违规类型 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[80px] text-xs">
                              {record.监管地区 || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 处理日志 */}
          {showResults && processingLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  处理日志
                </CardTitle>
                <CardDescription>
                  详细的处理过程记录和统计信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 max-h-80 overflow-auto">
                  <div className="space-y-2 text-sm">
                    {processingLogs.map((log, index) => {
                      // 根据日志内容类型设置不同的样式
                      let logStyle = "text-muted-foreground font-mono";
                      let icon = null;
                      
                      if (log && (log.includes('开始处理') || log.includes('文件信息'))) {
                        logStyle = "text-blue-600 font-medium";
                        icon = <CheckCircle className="h-4 w-4 text-blue-500" />;
                      } else if (log && (log.includes('处理进度') || log.includes('剩余时间'))) {
                        logStyle = "text-green-600 font-mono";
                        icon = <Loader2 className="h-4 w-4 text-green-500" />;
                      } else if (log && (log.includes('统计') || log.includes('成功率') || log.includes('时间统计'))) {
                        logStyle = "text-purple-600 font-medium";
                        icon = <BarChart3 className="h-4 w-4 text-purple-500" />;
                      } else if (log && (log.includes('输出结果') || log.includes('完成'))) {
                        logStyle = "text-emerald-600 font-medium";
                        icon = <CheckCircle className="h-4 w-4 text-emerald-500" />;
                      } else if (log && (log.includes('错误') || log.includes('失败'))) {
                        logStyle = "text-red-600 font-medium";
                        icon = <AlertCircle className="h-4 w-4 text-red-500" />;
                      }
                      
                      return (
                        <div key={index} className={`flex items-start gap-2 ${logStyle}`}>
                          {icon}
                          <span className="flex-1">{log}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 上传临时文件标签页 */}
        <TabsContent value="upload-temp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                上传临时保存文件
              </CardTitle>
              <CardDescription>
                上传批量处罚信息提取的临时保存文件，系统将解析并保存为标准格式的 cbircsplit 和 cbirccat 文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      支持 CSV 和 Excel 格式文件，最大 10MB
                    </p>
                    <div className="flex items-center justify-center">
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('temp-file-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        选择文件
                      </Button>
                      <Input
                        id="temp-file-upload"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleTempFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {tempFile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          已选择文件: {tempFile.name}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {(tempFile.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleUploadTempFile}
                    disabled={!tempFile || tempFileProcessing}
                    className="flex-1"
                  >
                    {tempFileProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Cpu className="h-4 w-4 mr-2" />
                        处理文件
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">处理功能说明：</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 文件必须包含以下列：原始ID、状态、行政处罚决定书文号、被处罚当事人、主要违法违规事实等</li>
                    <li>• 系统将自动过滤状态为"成功"的记录</li>
                    <li>• 处理后的文件将保存到项目根目录下的 cbirc 文件夹中</li>
                    <li>• 生成的文件名格式：cbircsplit_YYYYMMDD_HHMMSS.csv 和 cbirccat_YYYYMMDD_HHMMSS.csv</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}