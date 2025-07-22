'use client'

import dynamicImport from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

const CaseStats = dynamicImport(() => import('@/components/dashboard/case-stats').then(mod => ({ default: mod.CaseStats })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const MonthlyTrends = dynamicImport(() => import('@/components/dashboard/monthly-trends').then(mod => ({ default: mod.MonthlyTrends })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const RegionalAnalysis = dynamicImport(() => import('@/components/dashboard/regional-analysis').then(mod => ({ default: mod.RegionalAnalysis })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CBIRC 监管处罚分析系统</h1>
        <p className="text-muted-foreground">
          中国银保监会监管处罚案例数据分析与管理平台
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <CaseStats />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>月度趋势</CardTitle>
            <CardDescription>
              按月统计的处罚案例数量变化趋势
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyTrends />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>地区分布</CardTitle>
            <CardDescription>
              各省份处罚案例数量分布情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegionalAnalysis />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}