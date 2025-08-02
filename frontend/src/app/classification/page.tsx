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

  // 获取分类统计数据
  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/admin/classification-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
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
          description: '生成失败，请稍后重试',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('生成分类数据失败:', error)
      toast({
        title: '错误',
        description: '生成失败，请检查网络连接',
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
          const value = row[header] || ''
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
          description: '信息提取失败，请稍后重试',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('信息提取失败:', error)
      toast({
        title: '错误',
        description: '信息提取失败，请检查网络连接',
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
      
      try {
        const response = await fetch('http://localhost:8000/api/v1/classification/get-file-columns', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const result = await response.json()
          setFileColumns(result.columns)
          setPreviewData(result.preview_data)
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
            description: `文件上传成功，共 ${result.total_rows} 行数据`,
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

  // 批量处罚信息提取
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
        
        toast({
          title: '成功',
          description: `批量提取完成，处理了 ${result.processed_count} 条记录，提取了 ${result.extracted_count} 条结果`,
        })
      } else {
        const errorData = await response.json()
        toast({
          title: '错误',
          description: errorData.detail || '批量提取失败，请稍后重试',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('批量提取失败:', error)
      toast({
        title: '错误',
        description: '批量提取失败，请检查网络连接',
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
        <TabsList className="grid w-full grid-cols-3">
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
                系统将自动识别需要标签的案例，并生成待处理列表
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
                  选择要生成和下载的案例数量。"全部案例"将处理所有可用的待分类案例，<br />
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
                          ? `共找到 ${stats.uncategorized_cases} 条待分类案例，已生成全部 ${classificationData.length} 条案例用于下载`
                          : `共找到 ${stats.uncategorized_cases} 条待分类案例，已生成前 ${classificationData.length} 条案例用于下载`
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
                输入处罚决定书文本，自动提取关键信息
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
                              const headers = ['被处罚当事人', '罚没金额(万元)', '行业', '监管机关', '违规类型', '主要违法事实', '处罚决定', '决定日期', '文号'];
                              const csvData = [
                                headers.join(','),
                                ...extractResult.data.map((record: any) => [
                                  `"${record.被处罚当事人 || ''}"`,
                                  record.罚没总金额 && record.罚没总金额 !== '0' ? (parseInt(record.罚没总金额) / 10000).toString() : '0',
                                  `"${record.行业 || ''}"`,
                                  `"${record.作出处罚决定的机关名称 || ''}"`,
                                  `"${record.违规类型 || ''}"`,
                                  `"${record.主要违法违规事实 || ''}"`,
                                  `"${record.行政处罚决定 || ''}"`,
                                  `"${record.作出处罚决定的日期 || ''}"`,
                                  `"${record.行政处罚决定书文号 || ''}"`
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
                                  <TableHead className="min-w-[120px]">被处罚当事人</TableHead>
                                  <TableHead className="min-w-[100px]">罚没金额</TableHead>
                                  <TableHead className="min-w-[80px]">行业</TableHead>
                                  <TableHead className="min-w-[100px]">监管机关</TableHead>
                                  <TableHead className="min-w-[80px]">违规类型</TableHead>
                                  <TableHead className="min-w-[200px]">主要违法事实</TableHead>
                                  <TableHead className="min-w-[150px]">处罚决定</TableHead>
                                  <TableHead className="min-w-[80px]">决定日期</TableHead>
                                  <TableHead className="min-w-[100px]">文号</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Array.isArray(extractResult.data) ? extractResult.data.map((record: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">
                                      <div className="break-words max-w-[120px]">
                                        {record.被处罚当事人 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-right">
                                        {record.罚没总金额 && record.罚没总金额 !== '0' 
                                          ? `${(parseInt(record.罚没总金额) / 10000).toLocaleString()}万元`
                                          : '-'
                                        }
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">
                                        {record.行业 || '-'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[100px] text-xs">
                                        {record.作出处罚决定的机关名称 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[80px] text-xs">
                                        {record.违规类型 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[200px] text-xs">
                                        {record.主要违法违规事实 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[150px] text-xs">
                                        {record.行政处罚决定 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-xs">
                                        {record.作出处罚决定的日期 || '-'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="break-words max-w-[100px] text-xs">
                                        {record.行政处罚决定书文号 || '-'}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )) : (
                                  <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                    支持 CSV 和 Excel 格式文件，最大 10MB
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
                    <CardTitle className="text-lg">字段选择</CardTitle>
                    <CardDescription>
                      请选择ID字段和内容字段进行处罚信息提取
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
                        <Label>数据预览</Label>
                        <div className="border rounded-lg overflow-auto max-h-64">
                          <Table>
                            <TableHeader>
                              <TableRow>
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
                              {previewData.map((row, index) => (
                                <TableRow key={index}>
                                  {fileColumns.map((column) => (
                                    <TableCell key={column} className="max-w-[200px] truncate">
                                      {String(row[column] || '')}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleBatchExtract}
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
                      共 {batchResults.length} 条结果，成功 {batchResults.filter(r => r.状态 === '成功').length} 条，失败 {batchResults.filter(r => r.状态 === '失败').length} 条
                    </CardDescription>
                  </div>
                  <Button onClick={downloadBatchResults} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    下载CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">原始ID</TableHead>
                        <TableHead className="min-w-[60px]">状态</TableHead>
                        <TableHead className="min-w-[120px]">被处罚当事人</TableHead>
                        <TableHead className="min-w-[100px]">罚没金额</TableHead>
                        <TableHead className="min-w-[80px]">行业</TableHead>
                        <TableHead className="min-w-[120px]">决定机关</TableHead>
                        <TableHead className="min-w-[80px]">违规类型</TableHead>
                        <TableHead className="min-w-[200px]">主要违法事实</TableHead>
                        <TableHead className="min-w-[150px]">处罚决定</TableHead>
                        <TableHead className="min-w-[80px]">决定日期</TableHead>
                        <TableHead className="min-w-[100px]">文号</TableHead>
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
                            <div className="break-words max-w-[120px]">
                              {record.被处罚当事人 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-right">
                              {record.罚没总金额 && record.罚没总金额 !== '0' 
                                ? `${(parseInt(record.罚没总金额) / 10000).toLocaleString()}万元`
                                : '-'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {record.行业 || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[120px] text-xs">
                              {record.作出处罚决定的机关名称 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[80px] text-xs">
                              {record.违规类型 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[200px] text-xs">
                              {record.主要违法违规事实 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[150px] text-xs">
                              {record.行政处罚决定 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {record.作出处罚决定的日期 || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="break-words max-w-[100px] text-xs">
                              {record.行政处罚决定书文号 || '-'}
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
                  详细的处理过程记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 max-h-64 overflow-auto">
                  <div className="space-y-1 text-sm font-mono">
                    {processingLogs.map((log, index) => (
                      <div key={index} className="text-muted-foreground">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}