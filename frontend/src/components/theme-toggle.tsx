'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative hover:bg-gradient-to-r hover:from-yellow-500/10 hover:to-orange-500/10 rounded-full transition-all duration-300"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="glass-effect border-white/20 backdrop-blur-md"
      >
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className="hover:bg-gradient-to-r hover:from-yellow-500/10 hover:to-orange-500/10 transition-all duration-300"
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>浅色模式</span>
          {theme === 'light' && (
            <div className="ml-auto h-2 w-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"></div>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className="hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-300"
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>深色模式</span>
          {theme === 'dark' && (
            <div className="ml-auto h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className="hover:bg-gradient-to-r hover:from-green-500/10 hover:to-teal-500/10 transition-all duration-300"
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>跟随系统</span>
          {theme === 'system' && (
            <div className="ml-auto h-2 w-2 rounded-full bg-gradient-to-r from-green-500 to-teal-500"></div>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}