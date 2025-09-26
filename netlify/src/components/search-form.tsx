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
    <Card className="w-full bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">案例搜索</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-foreground">发布开始日期</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className="bg-background border-input text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-foreground">发布结束日期</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className="bg-background border-input text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title_text" className="text-foreground">标题</Label>
              <Input
                id="title_text"
                type="text"
                placeholder="输入标题关键词"
                value={formData.title_text || ''}
                onChange={(e) => handleInputChange('title_text', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="org_name" className="text-foreground">处罚机关</Label>
              <Input
                id="org_name"
                type="text"
                placeholder="输入处罚机关名称"
                value={formData.org_name || ''}
                onChange={(e) => handleInputChange('org_name', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min_penalty" className="text-foreground">最低罚款金额</Label>
              <Input
                id="min_penalty"
                type="number"
                placeholder="输入最低金额"
                value={formData.min_penalty || ''}
                onChange={(e) => handleInputChange('min_penalty', parseFloat(e.target.value) || 0)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="wenhao_text" className="text-foreground">行政处罚决定书文号</Label>
              <Input
                id="wenhao_text"
                type="text"
                placeholder="输入行政处罚决定书文号"
                value={formData.wenhao_text || ''}
                onChange={(e) => handleInputChange('wenhao_text', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="people_text" className="text-foreground">被处罚当事人</Label>
              <Input
                id="people_text"
                type="text"
                placeholder="输入被处罚当事人"
                value={formData.people_text || ''}
                onChange={(e) => handleInputChange('people_text', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event_text" className="text-foreground">主要违法违规事实</Label>
              <Input
                id="event_text"
                type="text"
                placeholder="输入主要违法违规事实"
                value={formData.event_text || ''}
                onChange={(e) => handleInputChange('event_text', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="law_text" className="text-foreground">行政处罚依据</Label>
              <Input
                id="law_text"
                type="text"
                placeholder="输入行政处罚依据"
                value={formData.law_text || ''}
                onChange={(e) => handleInputChange('law_text', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="penalty_text" className="text-foreground">行政处罚决定</Label>
              <Input
                id="penalty_text"
                type="text"
                placeholder="输入行政处罚决定"
                value={formData.penalty_text || ''}
                onChange={(e) => handleInputChange('penalty_text', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            

            
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-foreground">行业</Label>
              <Input
                id="industry"
                type="text"
                placeholder="输入行业关键词"
                value={formData.industry || ''}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="province" className="text-foreground">省份</Label>
              <Input
                id="province"
                type="text"
                placeholder="输入省份关键词"
                value={formData.province || ''}
                onChange={(e) => handleInputChange('province', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground">案件分类</Label>
              <Input
                id="category"
                type="text"
                placeholder="输入案件分类关键词"
                value={formData.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="keyword" className="text-foreground">通用关键词</Label>
              <Input
                id="keyword"
                type="text"
                placeholder="输入通用关键词"
                value={formData.keyword || ''}
                onChange={(e) => handleInputChange('keyword', e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isLoading ? '搜索中...' : '搜索'}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} className="border-input text-foreground hover:bg-accent hover:text-accent-foreground">
              重置
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}