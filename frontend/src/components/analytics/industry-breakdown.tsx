'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { apiClient } from '@/lib/api'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function IndustryBreakdown() {
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

  if (error || !stats || !stats.by_industry) {
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

  // Convert industry data to chart format
  const industryData = Object.entries(stats.by_industry).map(([industry, count]) => ({
    industry: industry || '未分类',
    count: count as number,
    percentage: ((count as number) / stats.total_cases * 100).toFixed(1)
  })).sort((a, b) => b.count - a.count)

  // Calculate total percentage for validation
  const totalPercentage = industryData.reduce((sum, item) => sum + parseFloat(item.percentage), 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>行业分布占比</CardTitle>
            <CardDescription>
              不同行业的处罚案例分布比例
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={industryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ industry, percentage }) => `${industry}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {industryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value} 起 (${((value as number) / stats.total_cases * 100).toFixed(1)}%)`, '案例数量']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>行业案例数量</CardTitle>
            <CardDescription>
              各行业的处罚案例数量统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="industry" 
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>行业统计详情</CardTitle>
            <CardDescription>
              各行业的详细统计信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {industryData.map((item, index) => (
                <div key={item.industry} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{item.industry}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{item.count} 起</div>
                    <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>行业分析概览</CardTitle>
            <CardDescription>
              行业分布的关键指标
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {industryData.length}
                  </div>
                  <div className="text-sm text-muted-foreground">行业类别数</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {industryData[0]?.industry || '暂无'}
                  </div>
                  <div className="text-sm text-muted-foreground">主要行业</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">行业排名</h4>
                {industryData.slice(0, 5).map((item, index) => (
                  <div key={item.industry} className="flex justify-between items-center text-sm">
                    <span>#{index + 1} {item.industry}</span>
                    <span className="font-medium">{item.count} 起 ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}