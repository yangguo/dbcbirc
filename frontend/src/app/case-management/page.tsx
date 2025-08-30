'use client'

import dynamicImport from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'





const CaseImportExport = dynamicImport(() => import('@/components/case-management/case-import-export').then(mod => ({ default: mod.CaseImportExport })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const CaseUpdate = dynamicImport(() => import('@/components/case-management/case-update').then(mod => ({ default: mod.CaseUpdate })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const CaseOnline = dynamicImport(() => import('@/components/case-management/case-online').then(mod => ({ default: mod.CaseOnline })), {
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

      <Tabs defaultValue="update" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="update" className="text-xs sm:text-sm">案例更新</TabsTrigger>
          <TabsTrigger value="online" className="text-xs sm:text-sm">案例上线</TabsTrigger>
          <TabsTrigger value="import-export" className="text-xs sm:text-sm">导入导出</TabsTrigger>
        </TabsList>

        <TabsContent value="update" className="space-y-4">
          <CaseUpdate />
        </TabsContent>

        <TabsContent value="online" className="space-y-4">
          <CaseOnline />
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <CaseImportExport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
