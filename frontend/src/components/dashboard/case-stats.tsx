'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api'
import { FileText, DollarSign, TrendingUp, Calendar } from 'lucide-react'

const statCards = [
  {
    key: 'total_cases',
    title: '案例总数',
    icon: FileText,
    gradient: 'from-blue-500 to-purple-600',
    bgGradient: 'from-blue-500/10 to-purple-600/10',
    description: '监管处罚案例',
    format: (value: number) => value?.toLocaleString() || '0'
  },
  {
    key: 'total_amount',
    title: '处罚总金额',
    icon: DollarSign,
    gradient: 'from-green-500 to-teal-600',
    bgGradient: 'from-green-500/10 to-teal-600/10',
    description: '累计处罚金额',
    format: (value: number) => {
      if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`
      if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
      return value?.toString() || '0'
    }
  },
  {
    key: 'avg_amount',
    title: '平均处罚金额',
    icon: TrendingUp,
    gradient: 'from-orange-500 to-red-600',
    bgGradient: 'from-orange-500/10 to-red-600/10',
    description: '单案平均金额',
    format: (value: number) => {
      if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`
      if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
      return value?.toString() || '0'
    }
  },
  {
    key: 'date_range',
    title: '数据时间范围',
    icon: Calendar,
    gradient: 'from-purple-500 to-pink-600',
    bgGradient: 'from-purple-500/10 to-pink-600/10',
    description: '数据覆盖时间',
    format: (value: any) => value?.start ? `${value.start} 至 ${value.end}` : '暂无数据'
  }
]

export function CaseStats() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['case-stats'],
    queryFn: () => apiClient.getCaseStats(),
  })

  if (isLoading) {
    return (
      <>
        {statCards.map((card, i) => (
          <Card key={i} className="card-hover animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gradient-to-r from-muted to-muted/80 rounded w-24"></div>
                <div className={`p-2 rounded-lg bg-gradient-to-r ${card.bgGradient}`}>
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="h-8 bg-gradient-to-r from-muted to-muted/80 rounded mb-2"></div>
              <div className="h-3 bg-gradient-to-r from-muted to-muted/80 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  if (error) {
    return (
      <>
        {statCards.map((card, i) => (
          <Card key={i} className="card-hover">
            <CardContent className="p-6 text-center">
              <div className={`p-3 rounded-full bg-gradient-to-r ${card.gradient} mx-auto mb-3 w-fit`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">数据加载失败</p>
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  return (
    <>
      {statCards.map((card, index) => (
        <Card 
          key={card.key} 
          className={`card-hover glass-effect border-white/20 bg-gradient-to-br ${card.bgGradient} relative overflow-hidden`}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-r ${card.gradient} shadow-lg`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-foreground">
                {card.format(stats?.[card.key as keyof typeof stats] as any)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${card.gradient} animate-pulse`}></div>
                {card.description}
              </div>
            </div>
          </CardContent>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
        </Card>
      ))}
    </>
  )
}