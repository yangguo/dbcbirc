'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { apiClient } from '@/lib/api'

export function RegionalAnalysis() {
  const { data: regionalStats, isLoading, error } = useQuery({
    queryKey: ['regional-stats'],
    queryFn: () => apiClient.getRegionalStats(),
  })

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (error || !regionalStats || regionalStats.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">暂无数据</p>
      </div>
    )
  }

  // Take top 10 provinces by case count
  const topProvinces = regionalStats.slice(0, 10)

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={topProvinces} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis 
            type="category" 
            dataKey="province" 
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip 
            formatter={(value, name) => [
              name === 'count' ? `${value} 起` : `${Number(value).toLocaleString()} 元`,
              name === 'count' ? '案例数量' : '处罚金额'
            ]}
          />
          <Bar 
            dataKey="count" 
            fill="#8884d8" 
            name="count"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}