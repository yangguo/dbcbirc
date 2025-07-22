'use client'

import dynamicImport from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

const AdminDashboard = dynamicImport(() => import('@/components/admin/admin-dashboard').then(mod => ({ default: mod.AdminDashboard })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const SystemStatus = dynamicImport(() => import('@/components/admin/system-status').then(mod => ({ default: mod.SystemStatus })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const DataManagement = dynamicImport(() => import('@/components/admin/data-management').then(mod => ({ default: mod.DataManagement })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">系统管理</h1>
        <p className="text-muted-foreground">
          数据更新、系统监控和管理功能
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">控制面板</TabsTrigger>
          <TabsTrigger value="status">系统状态</TabsTrigger>
          <TabsTrigger value="data">数据管理</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <SystemStatus />
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <DataManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}