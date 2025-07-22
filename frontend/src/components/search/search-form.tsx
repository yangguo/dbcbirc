'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CaseSearchRequest } from '@/lib/api'

interface SearchFormProps {
  onSearch?: (params: CaseSearchRequest) => void
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const { register, handleSubmit, reset } = useForm<CaseSearchRequest>()

  const onSubmit = (data: CaseSearchRequest) => {
    // Clean up empty strings
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== '' && value !== undefined)
    ) as CaseSearchRequest
    
    onSearch?.(cleanData)
  }

  const handleReset = () => {
    reset()
    onSearch?.({})
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>搜索条件</CardTitle>
        <CardDescription>设置搜索和筛选条件</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start_date">开始日期</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="end_date">结束日期</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wenhao_text">文号关键词</Label>
              <Input
                id="wenhao_text"
                placeholder="输入文号关键词"
                {...register('wenhao_text')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="people_text">当事人关键词</Label>
              <Input
                id="people_text"
                placeholder="输入当事人关键词"
                {...register('people_text')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event_text">案情关键词</Label>
              <Input
                id="event_text"
                placeholder="输入案情关键词"
                {...register('event_text')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="law_text">处罚依据</Label>
              <Input
                id="law_text"
                placeholder="输入处罚依据关键词"
                {...register('law_text')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="penalty_text">处罚决定关键词</Label>
              <Input
                id="penalty_text"
                placeholder="输入处罚决定关键词"
                {...register('penalty_text')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="org_text">处罚机关关键词</Label>
              <Input
                id="org_text"
                placeholder="输入处罚机关关键词"
                {...register('org_text')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="industry">行业</Label>
              <Input
                id="industry"
                placeholder="银行/保险"
                {...register('industry')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="province">处罚省份</Label>
              <Input
                id="province"
                placeholder="输入省份名称"
                {...register('province')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="min_penalty">最低处罚金额</Label>
              <Input
                id="min_penalty"
                type="number"
                placeholder="0"
                {...register('min_penalty', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              搜索
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