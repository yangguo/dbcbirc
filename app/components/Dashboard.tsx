'use client'

import { useState, useEffect } from 'react'
import { 
  DocumentTextIcon, 
  BuildingOfficeIcon, 
  CurrencyDollarIcon,
  TrendingUpIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface StatsData {
  totalCases: number
  totalAmount: number
  organizations: number
  recentUpdates: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsData>({
    totalCases: 0,
    totalAmount: 0,
    organizations: 0,
    recentUpdates: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setStats({
        totalCases: 15420,
        totalAmount: 2847500000,
        organizations: 156,
        recentUpdates: 23
      })
      setLoading(false)
    }, 1000)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const statCards = [
    {
      title: '案例总数',
      value: stats.totalCases.toLocaleString(),
      icon: DocumentTextIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100'
    },
    {
      title: '处罚金额',
      value: formatCurrency(stats.totalAmount),
      icon: CurrencyDollarIcon,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100'
    },
    {
      title: '监管机构',
      value: stats.organizations.toString(),
      icon: BuildingOfficeIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100'
    },
    {
      title: '近期更新',
      value: stats.recentUpdates.toString(),
      icon: ClockIcon,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-cbirc-600 to-cbirc-800 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">欢迎使用 CBIRC 监管处罚分析系统</h1>
        <p className="text-cbirc-100 text-lg">
          中国银保监会监管处罚案例数据分析与管理平台
        </p>
        <div className="mt-6 flex space-x-4">
          <button className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            开始分析
          </button>
          <button className="border border-white/30 hover:bg-white/10 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            查看文档
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className={`stat-card bg-gradient-to-br ${card.bgColor} border-l-4 border-l-current`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-gradient-to-r ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUpIcon className="h-5 w-5 mr-2 text-cbirc-600" />
            快速操作
          </h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
              <div className="font-medium text-gray-900">搜索案例</div>
              <div className="text-sm text-gray-500">按关键词、日期、机构等条件搜索</div>
            </button>
            <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
              <div className="font-medium text-gray-900">更新数据</div>
              <div className="text-sm text-gray-500">从官网获取最新案例数据</div>
            </button>
            <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
              <div className="font-medium text-gray-900">数据分析</div>
              <div className="text-sm text-gray-500">生成统计报告和可视化图表</div>
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-cbirc-600" />
            系统概况
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">数据覆盖范围</span>
              <span className="font-medium">2018-2024</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">更新频率</span>
              <span className="font-medium">每日</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">数据来源</span>
              <span className="font-medium">CBIRC官网</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">处理状态</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                正常运行
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h3>
        <div className="space-y-3">
          {[
            { action: '数据更新', detail: '银保监会机关 - 新增 15 条案例', time: '2小时前' },
            { action: '案例分析', detail: '完成 2024年第一季度 处罚趋势分析', time: '4小时前' },
            { action: '数据导出', detail: '导出搜索结果 - 共 234 条记录', time: '6小时前' },
            { action: '系统维护', detail: '数据库优化完成', time: '1天前' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div>
                <div className="font-medium text-gray-900">{activity.action}</div>
                <div className="text-sm text-gray-500">{activity.detail}</div>
              </div>
              <div className="text-sm text-gray-400">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}