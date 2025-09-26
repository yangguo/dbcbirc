import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/contexts/theme-context'

export const metadata: Metadata = {
  title: '在线案例搜索系统',
  description: '搜索和浏览监管案例数据库',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">
        <ThemeProvider
          defaultTheme="system"
          storageKey="cbirc-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}