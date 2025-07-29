'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'cbirc-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme
    }
    const stored = localStorage.getItem(storageKey)
    if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
      return stored as Theme
    }
    return defaultTheme
  })

  // Hydrate theme from localStorage on client side
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const stored = localStorage.getItem(storageKey)
    if (stored && (stored === 'light' || stored === 'dark' || stored === 'system') && stored !== theme) {
      setTheme(stored as Theme)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, theme)
      }
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}