'use client'

import dynamicImport from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

const CaseList = dynamicImport(() => import('@/components/case-management/case-list').then(mod => ({ default: mod.CaseList })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const CaseDetails = dynamicImport(() => import('@/components/case-management/case-details').then(mod => ({ default: mod.CaseDetails })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const CaseCategories = dynamicImport(() => import('@/components/case-management/case-categories').then(mod => ({ default: mod.CaseCategories })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const CaseImportExport = dynamicImport(() => import('@/components/case-management/case-import-export').then(mod => ({ default: mod.CaseImportExport })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const CaseUpdate = dynamicImport(() => import('@/components/case-management/case-update').then(mod => ({ default: mod.CaseUpdate })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

export default function CaseManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">案例管理</h1>
        <p className="text-muted-foreground">
          案例数据的查看、编辑、分类和导入导出功能
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="list" className="text-xs sm:text-sm">案例列表</TabsTrigger>
          <TabsTrigger value="details" className="text-xs sm:text-sm">案例详情</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm">分类管理</TabsTrigger>
          <TabsTrigger value="update" className="text-xs sm:text-sm">案例更新</TabsTrigger>
          <TabsTrigger value="import-export" className="text-xs sm:text-sm">导入导出</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <CaseList />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <CaseDetails />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CaseCategories />
        </TabsContent>

        <TabsContent value="update" className="space-y-4">
          <CaseUpdate />
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <CaseImportExport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
