'use client'

import { QueryProvider } from '@/lib/query-provider'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="cbirc-ui-theme"
    >
      <QueryProvider>
        {children}
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  )
}