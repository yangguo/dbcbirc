'use client'

import { useState } from 'react'
import { ArrowDownTrayIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline'

export default function CaseDownload() {
  const [downloadFormat, setDownloadFormat] = useState('csv')
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>(['银保监会机关'])
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [downloading, setDownloading] = useState(false)

  const organizations = ['银保监会机关', '银保监局本级', '银保监分局本级']
  const formats = [
    { id: 'csv', name: 'CSV', icon: TableCellsIcon, description: '逗号分隔值文件，适合Excel打开' },
    { id: 'excel', name: 'Excel', icon: DocumentTextIcon, description: 'Excel工作簿文件' },
    { id: 'json', name: 'JSON', icon: DocumentTextIcon, description: 'JSON格式，适合程序处理' }
  ]

  const handleOrgChange = (org: string) => {
    setSelectedOrgs(prev => 
      prev.includes(org) 
        ? prev.filter(o => o !== org)
        : [...prev, org]
    )
  }

  const handleDownload = async () => {
    setDownloading(true)
    // Simulate download
    setTimeout(() => {
      // Create a dummy download
      const element = document.createElement('a')
      const file = new Blob(['案例数据下载完成'], { type: 'text/plain' })
      element.href = URL.createObjectURL(file)
      element.download = `cbirc_cases_${new Date().toISOString().split('T')[0]}.${downloadFormat}`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      setDownloading(false)
    }, 2000)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">案例下载</h1>
        <p className="text-gray-600 mt-1">导出和下载案例数据</p>
      </div>

      {/* Download Configuration */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">下载设置</h3>
        
        {/* Organization Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">选择机构</label>
          <div className="space-y-2">
            {organizations.map((org) => (
              <label key={org} className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-cbirc-600 focus:ring-cbirc-500"
                  checked={selectedOrgs.includes(org)}
                  onChange={() => handleOrgChange(org)}
                />
                <span className="ml-2 text-sm text-gray-700">{org}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">日期范围</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">开始日期</label>
              <input
                type="date"
                className="input-field"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">结束日期</label>
              <input
                type="date"
                className="input-field"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">文件格式</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formats.map((format) => (
              <label
                key={format.id}
                className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  downloadFormat === format.id
                    ? 'border-cbirc-600 ring-2 ring-cbirc-600'
                    : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={format.id}
                  className="sr-only"
                  checked={downloadFormat === format.id}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                />
                <div className="flex items-center">
                  <format.icon className="h-6 w-6 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{format.name}</div>
                    <div className="text-xs text-gray-500">{format.description}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Download Button */}
        <div className="flex justify-center">
          <button
            onClick={handleDownload}
            disabled={downloading || selectedOrgs.length === 0}
            className="btn-primary flex items-center px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                下载中...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                开始下载
              </>
            )}
          </button>
        </div>
      </div>

      {/* Download Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-cbirc-600 mb-2">15,420</div>
          <div className="text-sm text-gray-600">总案例数</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">28.5GB</div>
          <div className="text-sm text-gray-600">数据大小</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-orange-600 mb-2">156</div>
          <div className="text-sm text-gray-600">监管机构</div>
        </div>
      </div>

      {/* Recent Downloads */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近下载</h3>
        <div className="space-y-3">
          {[
            { file: 'cbirc_cases_2024-01-15.csv', size: '2.3MB', date: '2024-01-15 14:30', status: '完成' },
            { file: 'cbirc_analysis_2024-01-10.xlsx', size: '5.1MB', date: '2024-01-10 09:15', status: '完成' },
            { file: 'cbirc_summary_2024-01-05.json', size: '1.8MB', date: '2024-01-05 16:45', status: '完成' },
          ].map((download, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">{download.file}</div>
                  <div className="text-sm text-gray-500">{download.size} • {download.date}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {download.status}
                </span>
                <button className="text-cbirc-600 hover:text-cbirc-800 text-sm font-medium">
                  重新下载
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}