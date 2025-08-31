"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CaseSearchRequest } from "@/types"

interface SearchFormProps {
  onSearch: (params: CaseSearchRequest) => void
  isLoading?: boolean
}

export function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
  const [formData, setFormData] = useState<CaseSearchRequest>({
    page: 1,
    page_size: 20
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({ ...formData, page: 1 })
  }

  const handleReset = () => {
    const resetData: CaseSearchRequest = {
      page: 1,
      page_size: 20
    }
    setFormData(resetData)
    onSearch(resetData)
  }

  const handleInputChange = (field: keyof CaseSearchRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>案例搜索</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">开始日期</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_date">结束日期</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title_text">标题搜索</Label>
              <Input
                id="title_text"
                type="text"
                placeholder="输入标题关键词"
                value={formData.title_text || ''}
                onChange={(e) => handleInputChange('title_text', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="org_name">组织名称</Label>
              <Input
                id="org_name"
                type="text"
                placeholder="输入组织名称"
                value={formData.org_name || ''}
                onChange={(e) => handleInputChange('org_name', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min_penalty">最低罚款金额</Label>
              <Input
                id="min_penalty"
                type="number"
                placeholder="输入最低金额"
                value={formData.min_penalty || ''}
                onChange={(e) => handleInputChange('min_penalty', parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="keyword">通用关键词</Label>
              <Input
                id="keyword"
                type="text"
                placeholder="输入通用关键词"
                value={formData.keyword || ''}
                onChange={(e) => handleInputChange('keyword', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '搜索中...' : '搜索'}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              重置
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}