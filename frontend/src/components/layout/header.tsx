'use client'

import { Building2, Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center space-x-4">
          <Building2 className="h-6 w-6" />
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">CBIRC 分析系统</h1>
            <p className="text-xs text-muted-foreground">银保监会监管处罚分析平台</p>
          </div>
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}