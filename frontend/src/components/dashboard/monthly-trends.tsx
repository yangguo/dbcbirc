'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { apiClient } from '@/lib/api'

export function MonthlyTrends() {
  const { data: trends, isLoading, error } = useQuery({
    queryKey: ['monthly-trends'],
    queryFn: () => apiClient.getMonthlyTrends(),
  })

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (error || !trends || trends.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">暂无数据</p>
      </div>
    )
  }

  // Sort trends by month
  const sortedTrends = [...trends].sort((a, b) => a.month.localeCompare(b.month))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sortedTrends}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            labelFormatter={(value) => `月份: ${value}`}
            formatter={(value, name) => [
              name === 'count' ? `${value} 起` : `${Number(value).toLocaleString()} 元`,
              name === 'count' ? '案例数量' : '处罚金额'
            ]}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#8884d8" 
            strokeWidth={2}
            dot={{ r: 4 }}
            name="count"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}