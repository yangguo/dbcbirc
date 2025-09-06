"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function DebugPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchDebugData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/debug')
      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error('Debug fetch error:', error)
      setDebugData({ error: error })
    } finally {
      setIsLoading(false)
    }
  }

  const testSearch = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page: 1, page_size: 2 }),
      })
      const data = await response.json()
      setDebugData({ searchResults: data })
    } catch (error) {
      console.error('Search test error:', error)
      setDebugData({ error: error })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">数据库调试页面</h1>
      
      <div className="space-y-4 mb-8">
        <Button onClick={fetchDebugData} disabled={isLoading}>
          {isLoading ? '加载中...' : '获取数据库信息'}
        </Button>
        
        <Button onClick={testSearch} disabled={isLoading} variant="outline">
          {isLoading ? '测试中...' : '测试搜索功能'}
        </Button>
      </div>

      {debugData && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">调试信息：</h2>
          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}