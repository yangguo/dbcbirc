import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CBIRC 监管处罚分析系统',
  description: '中国银保监会监管处罚案例数据分析与管理平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}