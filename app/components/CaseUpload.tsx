'use client'

import { useState } from 'react'
import { CloudArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function CaseUpload() {
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<any[]>([])

  const handleUpload = async () => {
    setUploading(true)
    // Simulate upload process
    setTimeout(() => {
      setUploadResults([
        {
          org: '银保监会机关',
          status: 'success',
          count: 156,
          message: '成功上线 156 条案例'
        },
        {
          org: '银保监局本级',
          status: 'success',
          count: 234,
          message: '成功上线 234 条案例'
        },
        {
          org: '银保监分局本级',
          status: 'warning',
          count: 89,
          message: '上线 89 条案例，3 条存在问题'
        }
      ])
      setUploading(false)
    }, 3000)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">案例上线</h1>
        <p className="text-gray-600 mt-1">将处理完成的案例数据上线到生产环境</p>
      </div>

      {/* Upload Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">待上线案例</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">479</div>
            <div className="text-sm text-gray-600">条案例准备就绪</div>
          </div>
        </div>
        
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">已上线案例</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">14,941</div>
            <div className="text-sm text-gray-600">条案例已上线</div>
          </div>
        </div>
        
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">上线成功率</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">98.5%</div>
            <div className="text-sm text-gray-600">历史成功率</div>
          </div>
        </div>
      </div>

      {/* Upload Control */}
      <div className="card p-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-cbirc-100 to-cbirc-200 rounded-full flex items-center justify-center mb-6">
            <CloudArrowUpIcon className="h-10 w-10 text-cbirc-600" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">案例数据上线</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            点击下方按钮开始上线流程。系统将自动验证数据完整性并部署到生产环境。
          </p>
          
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary flex items-center mx-auto px-8 py-4 text-lg"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                上线中...
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="h-5 w-5 mr-3" />
                开始上线
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">上线进度</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">数据验证</span>
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cbirc-600 mr-2"></div>
                <span className="text-sm text-cbirc-600">进行中</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-cbirc-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">上线结果</h3>
          <div className="space-y-3">
            {uploadResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center">
                  {result.status === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                  ) : (
                    <ExclamationTriangleIcon className={`h-5 w-5 mr-3 ${
                      result.status === 'warning' ? 'text-yellow-500' : 'text-red-500'
                    }`} />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{result.org}</div>
                    <div className={`text-sm ${
                      result.status === 'success'
                        ? 'text-green-700'
                        : result.status === 'warning'
                        ? 'text-yellow-700'
                        : 'text-red-700'
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

      {/* Upload History */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">上线历史</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  机构
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  案例数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作人
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { time: '2024-01-15 14:30', org: '银保监会机关', count: 156, status: '成功', operator: '系统管理员' },
                { time: '2024-01-14 09:15', org: '银保监局本级', count: 234, status: '成功', operator: '数据管理员' },
                { time: '2024-01-13 16:45', org: '银保监分局本级', count: 89, status: '部分成功', operator: '系统管理员' },
                { time: '2024-01-12 11:20', org: '银保监会机关', count: 67, status: '成功', operator: '数据管理员' },
              ].map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.org}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.count} 条
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.status === '成功'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.operator}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}