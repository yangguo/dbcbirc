'use client'

import dynamicImport from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, TrendingUp, MapPin, Building2, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

const MonthlyTrendsChart = dynamicImport(() => import('@/components/analytics/monthly-trends-chart').then(mod => ({ default: mod.MonthlyTrendsChart })), {
  ssr: false,
  loading: () => <div className="p-8 text-center">
    <div className="h-64 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl animate-pulse"></div>
  </div>
})

const PenaltyDistribution = dynamicImport(() => import('@/components/analytics/penalty-distribution').then(mod => ({ default: mod.PenaltyDistribution })), {
  ssr: false,
  loading: () => <div className="p-8 text-center">
    <div className="h-64 bg-gradient-to-r from-green-100 to-teal-100 rounded-xl animate-pulse"></div>
  </div>
})

const RegionalMap = dynamicImport(() => import('@/components/analytics/regional-map').then(mod => ({ default: mod.RegionalMap })), {
  ssr: false,
  loading: () => <div className="p-8 text-center">
    <div className="h-64 bg-gradient-to-r from-orange-100 to-red-100 rounded-xl animate-pulse"></div>
  </div>
})

const IndustryBreakdown = dynamicImport(() => import('@/components/analytics/industry-breakdown').then(mod => ({ default: mod.IndustryBreakdown })), {
  ssr: false,
  loading: () => <div className="p-8 text-center">
    <div className="h-64 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl animate-pulse"></div>
  </div>
})

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 p-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">数据分析中心</h1>
              <p className="text-lg text-white/90 flex items-center gap-2 mt-2">
                <Sparkles className="h-5 w-5" />
                监管处罚案例的深度数据分析与可视化
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">趋势分析</div>
              <div className="text-sm text-white/80">时间序列</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">金额分布</div>
              <div className="text-sm text-white/80">处罚统计</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">地区热力</div>
              <div className="text-sm text-white/80">区域分析</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">行业洞察</div>
              <div className="text-sm text-white/80">分类统计</div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24 animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Analytics Tabs */}
      <div className="glass-effect rounded-2xl p-6 border border-white/20">
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm border border-white/20">
            <TabsTrigger 
              value="trends" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              趋势分析
            </TabsTrigger>
            <TabsTrigger 
              value="penalties"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              处罚金额
            </TabsTrigger>
            <TabsTrigger 
              value="regional"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              地区分析
            </TabsTrigger>
            <TabsTrigger 
              value="industry"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              行业分析
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <div className="glass-effect rounded-xl p-6 border border-white/10">
              <MonthlyTrendsChart />
            </div>
          </TabsContent>

          <TabsContent value="penalties" className="space-y-4">
            <div className="glass-effect rounded-xl p-6 border border-white/10">
              <PenaltyDistribution />
            </div>
          </TabsContent>

          <TabsContent value="regional" className="space-y-4">
            <div className="glass-effect rounded-xl p-6 border border-white/10">
              <RegionalMap />
            </div>
          </TabsContent>

          <TabsContent value="industry" className="space-y-4">
            <div className="glass-effect rounded-xl p-6 border border-white/10">
              <IndustryBreakdown />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}