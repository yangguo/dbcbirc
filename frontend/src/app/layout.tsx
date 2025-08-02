import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CBIRC Analysis System',
  description: 'China Banking and Insurance Regulatory Commission penalty analysis system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <Providers>
          <div className="min-h-screen h-full flex flex-col">
            <Header />
            <div className="flex flex-1 h-full overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-auto relative">
                <div className="min-h-full w-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}