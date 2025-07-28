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
      const response = await fetch('http://localhost:8000/api/v1/admin/generate-classification-data', {
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
          description: `成功生成 ${data.uncategorized_cases || 0} 条待分类案例`,
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
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      toast({
        title: '成功',
        description: `已选择文件: ${file.name}`,
      })
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

    setProcessing(true)
    const formData = new FormData()
    formData.append('file', uploadedFile)

    try {
      const response = await fetch('http://localhost:8000/api/v1/classification/batch-extract-penalty-info', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: '成功',
          description: `批量提取完成，处理了 ${result.processed_count} 条记录`,
        })
        
        // 下载结果文件
        // 添加 BOM 以确保中文字符正确显示
        const BOM = '\uFEFF'
        const blob = new Blob([BOM + result.csv_data], { type: 'text/csv;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'penalty_extraction_results.csv'
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        toast({
          title: '错误',
          description: '批量提取失败，请稍后重试',
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
    a.download = 'classification_data.csv'
    a.click()
    window.URL.revokeObjectURL(url)
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
                <Card className="bg-blue-50 border-blue-200">
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
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="font-medium text-green-900">数据生成完成</div>
                      </div>
                      <div className="text-sm text-green-700">
                        共找到 {stats.uncategorized_cases} 条待分类案例，已分类 {stats.categorized_cases} 条案例
                      </div>
                      <Button 
                        onClick={downloadClassificationData}
                        variant="outline"
                        size="sm"
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        下载待分类数据 (CSV)
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
                <Card className="bg-gray-50">
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
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!extractResult.success && extractResult.error && (
                      <div className="text-red-600 bg-red-50 p-3 rounded border mb-4">
                        错误: {extractResult.error}
                      </div>
                    )}
                    
                    {extractResult.success && extractResult.data && (
                      <div className="space-y-4">
                        {displayMode === 'json' && (
                          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto">
                            <pre>{JSON.stringify(extractResult.data, null, 2)}</pre>
                          </div>
                        )}
                        
                        {displayMode === 'table' && (
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-1/3">字段</TableHead>
                                  <TableHead>值</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(extractResult.data).map(([key, value]: [string, any]) => (
                                  <TableRow key={key}>
                                    <TableCell className="font-medium">{key}</TableCell>
                                    <TableCell className="max-w-md">
                                      <div className="break-words">
                                        {typeof value === 'string' ? value : JSON.stringify(value)}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
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
                上传CSV文件进行批量处罚信息提取
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">上传文件</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="text-sm text-gray-600 mb-2">
                    点击上传或拖拽文件到此处
                  </div>
                  <div className="text-xs text-gray-500 mb-4">
                    支持 CSV 格式文件，最大 10MB
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv"
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
                    <div className="mt-2 text-sm text-gray-600">
                      已选择: {uploadedFile.name}
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleBatchExtract}
                disabled={processing || !uploadedFile}
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
        </TabsContent>
      </Tabs>
    </div>
  )
}