'use client'

import { useState } from 'react'
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function CaseUpdate() {
  const [updating, setUpdating] = useState(false)
  const [updateResults, setUpdateResults] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState('银保监会机关')
  const [pageRange, setPageRange] = useState({ start: 1, end: 1 })

  const organizations = ['银保监会机关', '银保监局本级', '银保监分局本级']

  const handleUpdateList = async () => {
    setUpdating(true)
    // Simulate API call
    setTimeout(() => {
      setUpdateResults([
        {
          org: selectedOrg,
          type: 'list',
          status: 'success',
          count: 25,
          message: `获取了 ${25} 条案例`
        }
      ])
      setUpdating(false)
    }, 2000)
  }

  const handleUpdateDetails = async () => {
    setUpdating(true)
    // Simulate API call
    setTimeout(() => {
      setUpdateResults(prev => [...prev, {
        org: selectedOrg,
        type: 'details',
        status: 'success',
        count: 15,
        message: `更新完成，共 ${15} 条案例详情`
      }])
      setUpdating(false)
    }, 3000)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">案例更新</h1>
        <p className="text-gray-600 mt-1">从CBIRC官网获取最新案例数据</p>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {organizations.map((org, index) => (
          <div key={index} className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{org}</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">列表案例</span>
                <span className="font-medium">1,234 条</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">详情案例</span>
                <span className="font-medium">1,156 条</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">最后更新</span>
                <span className="text-green-600 font-medium">2小时前</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Update Controls */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">更新设置</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择机构</label>
            <select
              className="input-field"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
            >
              {organizations.map((org) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">起始页</label>
            <input
              type="number"
              className="input-field"
              min="1"
              value={pageRange.start}
              onChange={(e) => setPageRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">结束页</label>
            <input
              type="number"
              className="input-field"
              min="1"
              value={pageRange.end}
              onChange={(e) => setPageRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleUpdateList}
            disabled={updating}
            className="btn-primary flex items-center"
          >
            {updating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                更新中...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                更新列表
              </>
            )}
          </button>
          
          <button
            onClick={handleUpdateDetails}
            disabled={updating}
            className="btn-secondary flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            更新详情
          </button>
        </div>
      </div>

      {/* Update Results */}
      {updateResults.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">更新结果</h3>
          <div className="space-y-3">
            {updateResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center">
                  {result.status === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {result.org} - {result.type === 'list' ? '列表更新' : '详情更新'}
                    </div>
                    <div className={`text-sm ${
                      result.status === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Update Schedule */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">自动更新设置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">定时更新</div>
              <div className="text-sm text-gray-500">每日自动更新案例数据</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cbirc-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cbirc-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">更新时间</div>
              <div className="text-sm text-gray-500">设置自动更新的时间</div>
            </div>
            <input
              type="time"
              className="input-field w-32"
              defaultValue="02:00"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">邮件通知</div>
              <div className="text-sm text-gray-500">更新完成后发送邮件通知</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cbirc-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cbirc-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}