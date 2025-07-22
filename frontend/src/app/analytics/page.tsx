'use client'

import dynamicImport from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

const MonthlyTrendsChart = dynamicImport(() => import('@/components/analytics/monthly-trends-chart').then(mod => ({ default: mod.MonthlyTrendsChart })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const PenaltyDistribution = dynamicImport(() => import('@/components/analytics/penalty-distribution').then(mod => ({ default: mod.PenaltyDistribution })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const RegionalMap = dynamicImport(() => import('@/components/analytics/regional-map').then(mod => ({ default: mod.RegionalMap })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

const IndustryBreakdown = dynamicImport(() => import('@/components/analytics/industry-breakdown').then(mod => ({ default: mod.IndustryBreakdown })), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
})

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">数据分析</h1>
        <p className="text-muted-foreground">
          监管处罚案例的深度数据分析与可视化
        </p>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">趋势分析</TabsTrigger>
          <TabsTrigger value="penalties">处罚金额</TabsTrigger>
          <TabsTrigger value="regional">地区分析</TabsTrigger>
          <TabsTrigger value="industry">行业分析</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <MonthlyTrendsChart />
        </TabsContent>

        <TabsContent value="penalties" className="space-y-4">
          <PenaltyDistribution />
        </TabsContent>

        <TabsContent value="regional" className="space-y-4">
          <RegionalMap />
        </TabsContent>

        <TabsContent value="industry" className="space-y-4">
          <IndustryBreakdown />
        </TabsContent>
      </Tabs>
    </div>
  )
}