'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Search, 
  BarChart3, 
  Settings, 
  FileText,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react'

const navigation = [
  {
    name: '概览',
    href: '/',
    icon: Home,
    gradient: 'from-blue-500 to-purple-600',
    bgGradient: 'from-blue-500/10 to-purple-600/10',
  },
  {
    name: '案例搜索',
    href: '/search',
    icon: Search,
    gradient: 'from-green-500 to-teal-600',
    bgGradient: 'from-green-500/10 to-teal-600/10',
  },
  {
    name: '数据分析',
    href: '/analytics',
    icon: BarChart3,
    gradient: 'from-orange-500 to-red-600',
    bgGradient: 'from-orange-500/10 to-red-600/10',
  },
  {
    name: '案例管理',
    href: '/admin',
    icon: Settings,
    gradient: 'from-purple-500 to-pink-600',
    bgGradient: 'from-purple-500/10 to-pink-600/10',
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-72 glass-effect border-r border-white/20">
      <div className="space-y-6 py-6">
        <div className="px-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gradient">
                功能菜单
              </h2>
            </div>
            <nav className="space-y-2">
              {navigation.map((item, index) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 hover:scale-105',
                      isActive 
                        ? `bg-gradient-to-r ${item.bgGradient} border border-white/20 shadow-lg` 
                        : 'hover:bg-white/10 hover:backdrop-blur-sm'
                    )}
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    <div className={cn(
                      'p-2 rounded-lg mr-3 transition-all duration-300',
                      isActive 
                        ? `bg-gradient-to-r ${item.gradient} shadow-lg` 
                        : 'bg-white/10 group-hover:bg-white/20'
                    )}>
                      <item.icon className={cn(
                        'h-4 w-4 transition-all duration-300',
                        isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
                      )} />
                    </div>
                    <span className={cn(
                      'transition-all duration-300',
                      isActive ? 'text-foreground font-semibold' : 'text-muted-foreground group-hover:text-foreground'
                    )}>
                      {item.name}
                    </span>
                    {isActive && (
                      <div className="ml-auto">
                        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse"></div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
        
        {/* Quick Stats Section */}
        <div className="px-6">
          <div className="rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">系统状态</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">数据同步</span>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-green-600">正常</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">API状态</span>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-xs text-blue-600">在线</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}