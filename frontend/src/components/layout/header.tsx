'use client'

import { Building2, Bell, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function Header() {
  return (
    <header className="glass-effect border-b border-white/20 sticky top-0 z-50">
      <div className="container flex h-20 items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="absolute inset-0 gradient-primary rounded-xl blur-sm opacity-75"></div>
            <div className="relative bg-white/90 dark:bg-black/90 p-3 rounded-xl">
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gradient">CBIRC 分析系统</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-yellow-500" />
              银保监会监管处罚分析平台
            </p>
          </div>
        </div>
        
        <div className="ml-auto flex items-center space-x-2">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 rounded-full transition-all duration-300"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-pulse"></span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 rounded-full transition-all duration-300"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}