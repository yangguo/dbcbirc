import { useState, useCallback } from 'react'

interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface Toast extends ToastOptions {
  id: string
}

let toastCount = 0

const generateId = () => {
  toastCount += 1
  return `toast-${toastCount}`
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((options: ToastOptions) => {
    const id = generateId()
    const newToast: Toast = {
      id,
      ...options,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)

    return { id }
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return {
    toast,
    toasts,
    dismiss,
  }
}