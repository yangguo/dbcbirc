import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/theme-context'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
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