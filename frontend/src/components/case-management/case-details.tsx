'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api'
import { Search, FileText, Edit, Save, X, Calendar, MapPin, DollarSign } from 'lucide-react'

interface CaseDetailData {
  id: string
  title: string
  subtitle: string
  publish_date: string
  content: string
  summary?: string
  wenhao?: string
  people?: string
  event?: string
  law?: string
  penalty?: string
  org?: string
  penalty_date?: string
  category?: string
  amount?: number
  province?: string
  industry?: string
}

export function CaseDetails() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<CaseDetailData>>({})

  const { toast } = useToast()

  // Query for specific case details
  const { data: caseDetail, isLoading, refetch } = useQuery({
    queryKey: ['caseDetail', selectedCaseId],
    queryFn: () => selectedCaseId ? apiClient.getCaseById(selectedCaseId) : null,
    enabled: !!selectedCaseId,
  })

  const handleSearchCase = () => {
    if (!selectedCaseId.trim()) {
      toast({
        title: '输入错误',
        description: '请输入案例ID',
        variant: 'destructive',
      })
      return
    }
    refetch()
  }

  const handleEdit = () => {
    if (caseDetail) {
      setEditForm(caseDetail as CaseDetailData)
      setIsEditing(true)
    }
  }

  const handleSave = () => {
    // TODO: Implement save functionality
    toast({
      title: '保存成功',
      description: '案例信息已更新',
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditForm({})
    setIsEditing(false)
  }

  const caseData = caseDetail as CaseDetailData

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            查找案例详情
          </CardTitle>
          <CardDescription>
            输入案例ID查看详细信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="caseId">案例ID</Label>
              <Input
                id="caseId"
                placeholder="输入案例ID"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearchCase} disabled={isLoading}>
                {isLoading ? (
                  <Search className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                查找
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Details */}
      {caseData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  案例详情
                </CardTitle>
                <CardDescription>
                  案例ID: {caseData.id}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      保存
                    </Button>
                    <Button variant="outline" onClick={handleCancel} size="sm">
                      <X className="h-4 w-4 mr-2" />
                      取消
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleEdit} size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">基本信息</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">案例标题</Label>
                  {isEditing ? (
                    <Input
                      id="title"
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm bg-muted p-3 rounded-md">{caseData.title}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle">文号</Label>
                  {isEditing ? (
                    <Input
                      id="subtitle"
                      value={editForm.subtitle || ''}
                      onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm bg-muted p-3 rounded-md">{caseData.subtitle}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    发布日期
                  </Label>
                  <p className="text-sm bg-muted p-3 rounded-md">{caseData.publish_date}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    地区
                  </Label>
                  <p className="text-sm bg-muted p-3 rounded-md">{caseData.province || '未知'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    处罚金额
                  </Label>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {caseData.amount ? `¥${caseData.amount.toLocaleString()}` : '未知'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {caseData.category && (
                  <Badge variant="outline">{caseData.category}</Badge>
                )}
                {caseData.industry && (
                  <Badge variant="secondary">{caseData.industry}</Badge>
                )}
              </div>
            </div>

            <div className="border-t my-6"></div>

            {/* Detailed Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">详细信息</h3>
              
              <div className="space-y-2">
                <Label htmlFor="people">被处罚当事人</Label>
                {isEditing ? (
                  <Textarea
                    id="people"
                    value={editForm.people || ''}
                    onChange={(e) => setEditForm({ ...editForm, people: e.target.value })}
                    rows={2}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {caseData.people || '未提供'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="event">主要违法违规事实</Label>
                {isEditing ? (
                  <Textarea
                    id="event"
                    value={editForm.event || ''}
                    onChange={(e) => setEditForm({ ...editForm, event: e.target.value })}
                    rows={4}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {caseData.event || '未提供'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="law">行政处罚依据</Label>
                {isEditing ? (
                  <Textarea
                    id="law"
                    value={editForm.law || ''}
                    onChange={(e) => setEditForm({ ...editForm, law: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {caseData.law || '未提供'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="penalty">行政处罚决定</Label>
                {isEditing ? (
                  <Textarea
                    id="penalty"
                    value={editForm.penalty || ''}
                    onChange={(e) => setEditForm({ ...editForm, penalty: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {caseData.penalty || '未提供'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="org">作出处罚决定的机关名称</Label>
                {isEditing ? (
                  <Input
                    id="org"
                    value={editForm.org || ''}
                    onChange={(e) => setEditForm({ ...editForm, org: e.target.value })}
                  />
                ) : (
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {caseData.org || '未提供'}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t my-6"></div>

            {/* Full Content */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">原始内容</h3>
              <div className="space-y-2">
                <Label htmlFor="content">完整案例内容</Label>
                <div className="max-h-96 overflow-y-auto bg-muted p-4 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{caseData.content}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Case Selected */}
      {!selectedCaseId && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">未选择案例</h3>
            <p className="text-muted-foreground">请在上方输入案例ID查看详细信息</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>加载案例详情中...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
