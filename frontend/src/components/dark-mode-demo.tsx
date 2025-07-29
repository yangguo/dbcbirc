'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Palette, Sparkles } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

export function DarkModeDemo() {
  const { theme } = useTheme()

  return (
    <Card className="card-hover bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200/50 dark:border-indigo-800/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              深色模式支持
              <Badge variant="secondary" className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20">
                新功能
              </Badge>
            </CardTitle>
            <CardDescription>
              智能主题切换，支持浅色、深色和跟随系统模式
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">浅色模式</span>
            </div>
            <p className="text-xs text-muted-foreground">
              明亮清新的界面设计，适合白天使用
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">深色模式</span>
            </div>
            <p className="text-xs text-muted-foreground">
              护眼深色界面，减少视觉疲劳
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200/30 dark:border-purple-800/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">当前主题</span>
          </div>
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            {theme === 'light' ? '浅色模式' : theme === 'dark' ? '深色模式' : '跟随系统'}
          </Badge>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            点击右上角的主题切换按钮体验不同模式
          </p>
          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse"></div>
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-green-400 to-teal-500 animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}