'use client'

import dynamicImport from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3, MapPin, Sparkles, Activity } from 'lucide-react'
import { DarkModeDemo } from '@/components/dark-mode-demo'

export const dynamic = 'force-dynamic'

const CaseStats = dynamicImport(() => import('@/components/dashboard/case-stats').then(mod => ({ default: mod.CaseStats })), {
  ssr: false,
  loading: () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="card-hover animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-2"></div>
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})

const MonthlyTrends = dynamicImport(() => import('@/components/dashboard/monthly-trends').then(mod => ({ default: mod.MonthlyTrends })), {
  ssr: false,
  loading: () => <div className="p-6 text-center animate-pulse">
    <div className="h-64 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg"></div>
  </div>
})

const RegionalAnalysis = dynamicImport(() => import('@/components/dashboard/regional-analysis').then(mod => ({ default: mod.RegionalAnalysis })), {
  ssr: false,
  loading: () => <div className="p-6 text-center animate-pulse">
    <div className="h-64 bg-gradient-to-r from-green-100 to-teal-100 rounded-lg"></div>
  </div>
})

export default function HomePage() {
  return (
    <div className="space-y-8 p-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">CBIRC 监管处罚分析系统</h1>
              <p className="text-lg text-white/90 flex items-center gap-2 mt-2">
                <Sparkles className="h-5 w-5" />
                中国银保监会监管处罚案例数据分析与管理平台
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">实时监控</div>
              <div className="text-sm text-white/80">数据同步</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">智能分析</div>
              <div className="text-sm text-white/80">AI驱动</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">可视化</div>
              <div className="text-sm text-white/80">图表展示</div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24 animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <CaseStats />
      </div>

      {/* Charts Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="card-hover glass-effect border-white/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">月度趋势分析</CardTitle>
                <CardDescription className="text-muted-foreground">
                  按月统计的处罚案例数量变化趋势
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <MonthlyTrends />
          </CardContent>
        </Card>

        <Card className="card-hover glass-effect border-white/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">地区分布热力图</CardTitle>
                <CardDescription className="text-muted-foreground">
                  各省份处罚案例数量分布情况
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <RegionalAnalysis />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card className="card-hover bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">数据分析</h3>
                <p className="text-sm text-muted-foreground">深度分析处罚趋势</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">实时监控</h3>
                <p className="text-sm text-muted-foreground">监控最新案例动态</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">智能搜索</h3>
                <p className="text-sm text-muted-foreground">AI驱动的案例检索</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DarkModeDemo />
      </div>
    </div>
  )
}