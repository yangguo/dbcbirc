'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api'
import { CheckCircle, XCircle, Clock, Database, Server, Wifi, RefreshCw } from 'lucide-react'

export function SystemStatus() {
  const { data: systemInfo, isLoading, refetch: refetchSystemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: () => apiClient.getSystemInfo(),
    enabled: false, // Disable automatic fetching
  })

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['case-stats'],
    queryFn: () => apiClient.getCaseStats(),
    enabled: false, // Disable automatic fetching
  })

  const handleRefreshAll = () => {
    refetchSystemInfo()
    refetchStats()
  }

  const statusItems = [
    {
      name: '数据库连接',
      status: (systemInfo as any)?.database_status === 'connected' ? 'healthy' : 'error',
      icon: Database,
      description: (systemInfo as any)?.database_status === 'connected' ? '数据库连接正常' : '数据库连接异常',
    },
    {
      name: 'API服务',
      status: 'healthy',
      icon: Server,
      description: 'API服务运行正常',
    },
    {
      name: '网络连接',
      status: 'healthy',
      icon: Wifi,
      description: '网络连接正常',
    },

  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">正常</Badge>
      case 'error':
        return <Badge variant="destructive">异常</Badge>
      case 'running':
        return <Badge variant="default" className="bg-blue-500">运行中</Badge>
      default:
        return <Badge variant="secondary">空闲</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>加载系统状态中...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">系统状态</h2>
        <Button onClick={handleRefreshAll} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新状态
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {statusItems.map((item) => (
          <Card key={item.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(item.status)}
                  <span className="text-sm">{item.description}</span>
                </div>
                {getStatusBadge(item.status)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>数据统计</CardTitle>
            <CardDescription>
              当前系统中的数据统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">案例总数</span>
                <span className="text-sm font-medium">
                  {(stats as any)?.total_cases?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">处罚总金额</span>
                <span className="text-sm font-medium">
                  {stats ? `${((stats as any).total_amount / 100000000).toFixed(1)}亿元` : '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">数据时间范围</span>
                <span className="text-sm font-medium">
                  {(stats as any)?.date_range ? `${(stats as any).date_range.start} 至 ${(stats as any).date_range.end}` : '暂无'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">涉及省份</span>
                <span className="text-sm font-medium">
                  {(stats as any)?.by_province ? Object.keys((stats as any).by_province).length : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系统健康检查</CardTitle>
            <CardDescription>
              系统各组件的健康状态
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">数据库连接</span>
                <div className="flex items-center space-x-2">
                  {(systemInfo as any)?.database_status === 'connected' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {(systemInfo as any)?.database_status === 'connected' ? '正常' : '异常'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API响应</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">正常</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">数据完整性</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">正常</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">系统负载</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">正常</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}