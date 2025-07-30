'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { Tags, Plus, Edit, Trash2, RefreshCw, BarChart3, Save } from 'lucide-react'

interface CategoryStats {
  category: string
  count: number
  percentage: number
}

export function CaseCategories() {
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [selectedCases, setSelectedCases] = useState<string[]>([])
  const [batchCategory, setBatchCategory] = useState('')

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Query for classification stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['classificationStats'],
    queryFn: () => apiClient.getSystemInfo(), // Using system info as placeholder
    refetchInterval: 30000,
  })

  // Mock data for categories
  const categories: CategoryStats[] = [
    { category: '银行违规', count: 156, percentage: 45.2 },
    { category: '保险违规', count: 89, percentage: 25.8 },
    { category: '混合违规', count: 67, percentage: 19.4 },
    { category: '未分类', count: 33, percentage: 9.6 },
  ]

  const availableCategories = [
    '银行违规',
    '保险违规',
    '混合违规',
    '资金违规',
    '合规违规',
    '风险管理',
    '内控管理',
    '其他违规'
  ]

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast({
        title: '输入错误',
        description: '请输入分类名称',
        variant: 'destructive',
      })
      return
    }

    // TODO: Implement add category
    toast({
      title: '分类创建成功',
      description: `已创建新分类: ${newCategory}`,
    })
    setNewCategory('')
  }

  const handleEditCategory = (category: string) => {
    setEditingCategory(category)
  }

  const handleSaveCategory = (oldCategory: string, newCategoryName: string) => {
    // TODO: Implement save category
    toast({
      title: '分类更新成功',
      description: `分类已从 "${oldCategory}" 更新为 "${newCategoryName}"`,
    })
    setEditingCategory(null)
  }

  const handleDeleteCategory = (category: string) => {
    // TODO: Implement delete category
    toast({
      title: '分类删除成功',
      description: `已删除分类: ${category}`,
      variant: 'destructive',
    })
  }

  const handleBatchCategorize = () => {
    if (!batchCategory || selectedCases.length === 0) {
      toast({
        title: '操作错误',
        description: '请选择案例和分类',
        variant: 'destructive',
      })
      return
    }

    // TODO: Implement batch categorize
    toast({
      title: '批量分类成功',
      description: `已为 ${selectedCases.length} 个案例设置分类: ${batchCategory}`,
    })
    setSelectedCases([])
  }

  const handleGenerateAutoCategories = () => {
    // TODO: Implement auto categorization
    toast({
      title: '自动分类已启动',
      description: '正在使用AI进行自动分类，请稍候...',
    })
  }

  return (
    <div className="space-y-6">
      {/* Category Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        {categories.map((stat) => (
          <Card key={stat.category}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.category}</p>
                  <p className="text-2xl font-bold">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">{stat.percentage}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              分类管理
            </CardTitle>
            <CardDescription>
              创建、编辑和删除案例分类
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Category */}
            <div className="space-y-2">
              <Label htmlFor="newCategory">新增分类</Label>
              <div className="flex gap-2">
                <Input
                  id="newCategory"
                  placeholder="输入分类名称"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button onClick={handleAddCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加
                </Button>
              </div>
            </div>

            {/* Category List */}
            <div className="space-y-2">
              <Label>现有分类</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center justify-between p-2 border rounded">
                    {editingCategory === category ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          defaultValue={category}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveCategory(category, e.currentTarget.value)
                            }
                          }}
                        />
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector('input')
                            if (input) {
                              handleSaveCategory(category, input.value)
                            }
                          }}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm">{category}</span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteCategory(category)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              批量操作
            </CardTitle>
            <CardDescription>
              批量分类和自动分类功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Batch Categorize */}
            <div className="space-y-2">
              <Label htmlFor="batchCategory">批量分类</Label>
              <div className="space-y-2">
                <Select
                  value={batchCategory}
                  onValueChange={setBatchCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleBatchCategorize} 
                  className="w-full"
                  disabled={selectedCases.length === 0}
                >
                  <Tags className="h-4 w-4 mr-2" />
                  批量设置分类 ({selectedCases.length} 个案例)
                </Button>
              </div>
            </div>

            {/* Auto Categorization */}
            <div className="space-y-2">
              <Label>自动分类</Label>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  使用AI自动分析案例内容并进行分类
                </p>
                <Button 
                  onClick={handleGenerateAutoCategories}
                  variant="outline" 
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  启动自动分类
                </Button>
              </div>
            </div>

            {/* Category Statistics */}
            <div className="space-y-2">
              <Label>分类统计</Label>
              <div className="space-y-1">
                {categories.map((stat) => (
                  <div key={stat.category} className="flex justify-between items-center text-sm">
                    <span>{stat.category}</span>
                    <Badge variant="outline">
                      {stat.count} ({stat.percentage}%)
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>分类分布</CardTitle>
          <CardDescription>
            各分类的案例数量分布情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((stat) => (
              <div key={stat.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{stat.category}</span>
                  <span>{stat.count} 个案例</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Categorization Activity */}
      <Card>
        <CardHeader>
          <CardTitle>最近分类活动</CardTitle>
          <CardDescription>
            最近的分类操作记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>案例ID</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>操作员</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2024-01-15 14:30</TableCell>
                <TableCell>CASE-001</TableCell>
                <TableCell>
                  <Badge variant="default">分类</Badge>
                </TableCell>
                <TableCell>银行违规</TableCell>
                <TableCell>系统管理员</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2024-01-15 14:25</TableCell>
                <TableCell>CASE-002</TableCell>
                <TableCell>
                  <Badge variant="secondary">自动分类</Badge>
                </TableCell>
                <TableCell>保险违规</TableCell>
                <TableCell>AI系统</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2024-01-15 14:20</TableCell>
                <TableCell>CASE-003</TableCell>
                <TableCell>
                  <Badge variant="outline">重新分类</Badge>
                </TableCell>
                <TableCell>混合违规</TableCell>
                <TableCell>系统管理员</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
