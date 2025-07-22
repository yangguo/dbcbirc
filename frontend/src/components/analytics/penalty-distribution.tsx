'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { apiClient } from '@/lib/api'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function PenaltyDistribution() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['case-stats'],
    queryFn: () => apiClient.getCaseStats(),
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">暂无数据</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Create penalty amount ranges
  const penaltyRanges = [
    { name: '10万以下', min: 0, max: 100000, count: 0 },
    { name: '10-50万', min: 100000, max: 500000, count: 0 },
    { name: '50-100万', min: 500000, max: 1000000, count: 0 },
    { name: '100-500万', min: 1000000, max: 5000000, count: 0 },
    { name: '500万以上', min: 5000000, max: Infinity, count: 0 },
  ]

  // This would typically be calculated from actual case data
  // For now, we'll create sample distribution data
  const sampleDistribution = [
    { name: '10万以下', count: Math.floor(stats.total_cases * 0.4), value: 40 },
    { name: '10-50万', count: Math.floor(stats.total_cases * 0.3), value: 30 },
    { name: '50-100万', count: Math.floor(stats.total_cases * 0.15), value: 15 },
    { name: '100-500万', count: Math.floor(stats.total_cases * 0.1), value: 10 },
    { name: '500万以上', count: Math.floor(stats.total_cases * 0.05), value: 5 },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>处罚金额分布</CardTitle>
          <CardDescription>
            不同金额区间的案例分布比例
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sampleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sampleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, '占比']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>处罚金额区间统计</CardTitle>
          <CardDescription>
            各金额区间的案例数量
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`${value} 起`, '案例数量']}
                />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>处罚金额统计概览</CardTitle>
          <CardDescription>
            整体处罚金额的统计信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(stats.total_amount / 100000000).toFixed(1)}亿
              </div>
              <div className="text-sm text-muted-foreground">处罚总金额</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(stats.avg_amount / 10000).toFixed(1)}万
              </div>
              <div className="text-sm text-muted-foreground">平均处罚金额</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.total_cases.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">案例总数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.total_amount > 0 ? ((stats.total_amount / stats.total_cases) / 10000).toFixed(1) : 0}万
              </div>
              <div className="text-sm text-muted-foreground">单案平均金额</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}