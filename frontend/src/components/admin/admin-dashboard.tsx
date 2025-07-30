'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api'
import { RefreshCw, Database, Activity, AlertCircle } from 'lucide-react'

export function AdminDashboard() {
  const { data: systemInfo, isLoading, refetch } = useQuery({
    queryKey: ['system-info'],
    queryFn: () => apiClient.getSystemInfo(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleRefreshData = async () => {
    try {
      await apiClient.refreshData()
      refetch()
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
  }

  const handleRefreshSystemInfo = () => {
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据库状态</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={(systemInfo as any)?.database_status === 'connected' ? 'default' : 'destructive'}>
                {(systemInfo as any)?.database_status === 'connected' ? '已连接' : '未连接'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API版本</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(systemInfo as any)?.api_version || 'v1.0.0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统健康</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant="default">正常</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>
              常用的系统管理操作
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleRefreshSystemInfo} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新系统状态
            </Button>
            <Button onClick={handleRefreshData} variant="outline" className="w-full">
              <Database className="h-4 w-4 mr-2" />
              刷新数据缓存
            </Button>
            <Button variant="outline" className="w-full">
              <Activity className="h-4 w-4 mr-2" />
              查看系统日志
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系统信息</CardTitle>
            <CardDescription>
              当前系统的运行状态信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">数据库状态</span>
                <span className="text-sm font-medium">
                  {(systemInfo as any)?.database_status || '未知'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">API版本</span>
                <span className="text-sm font-medium">
                  {(systemInfo as any)?.api_version || '未知'}
                </span>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>加载系统信息中...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}