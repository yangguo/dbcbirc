'use client'

import { useState } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

export default function CaseSearch() {
  const [searchType, setSearchType] = useState('classification')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchForm, setSearchForm] = useState({
    startDate: '',
    endDate: '',
    wenhao: '',
    people: '',
    event: '',
    law: '',
    penalty: '',
    org: '',
    industry: '',
    minPenalty: '',
    province: ''
  })

  const handleSearch = async () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setSearchResults([
        {
          id: 1,
          title: '中国银行股份有限公司违规案例',
          wenhao: '银保监罚决字〔2024〕1号',
          date: '2024-01-15',
          org: '银保监会',
          penalty: '罚款500万元',
          amount: 5000000
        },
        {
          id: 2,
          title: '平安保险违规销售案例',
          wenhao: '银保监罚决字〔2024〕2号',
          date: '2024-01-10',
          org: '银保监局',
          penalty: '罚款200万元',
          amount: 2000000
        }
      ])
      setLoading(false)
    }, 1500)
  }

  const handleInputChange = (field: string, value: string) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">案例搜索</h1>
          <p className="text-gray-600 mt-1">搜索和筛选监管处罚案例</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary">
            <FunnelIcon className="h-4 w-4 mr-2" />
            高级筛选
          </button>
          <button className="btn-primary">
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            导出结果
          </button>
        </div>
      </div>

      {/* Search Type Selection */}
      <div className="card p-6">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setSearchType('classification')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchType === 'classification'
                ? 'bg-cbirc-100 text-cbirc-700 border border-cbirc-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            案情分类搜索
          </button>
          <button
            onClick={() => setSearchType('detail')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchType === 'detail'
                ? 'bg-cbirc-100 text-cbirc-700 border border-cbirc-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            案情经过搜索
          </button>
        </div>

        {/* Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
            <input
              type="date"
              className="input-field"
              value={searchForm.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
            <input
              type="date"
              className="input-field"
              value={searchForm.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">文号关键词</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入文号关键词"
              value={searchForm.wenhao}
              onChange={(e) => handleInputChange('wenhao', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">当事人关键词</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入当事人关键词"
              value={searchForm.people}
              onChange={(e) => handleInputChange('people', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">案情关键词</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入案情关键词"
              value={searchForm.event}
              onChange={(e) => handleInputChange('event', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">处罚依据</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入处罚依据"
              value={searchForm.law}
              onChange={(e) => handleInputChange('law', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">处罚决定关键词</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入处罚决定关键词"
              value={searchForm.penalty}
              onChange={(e) => handleInputChange('penalty', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">处罚机关</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入处罚机关"
              value={searchForm.org}
              onChange={(e) => handleInputChange('org', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">最低处罚金额</label>
            <input
              type="number"
              className="input-field"
              placeholder="输入最低金额"
              value={searchForm.minPenalty}
              onChange={(e) => handleInputChange('minPenalty', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-primary flex items-center px-8 py-3 text-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                搜索中...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                开始搜索
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              搜索结果 ({searchResults.length} 条)
            </h3>
            <button className="btn-secondary text-sm">
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              导出
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    案例标题
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    文号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    发布日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    处罚机关
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    处罚决定
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map((result: any) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{result.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{result.wenhao}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{result.date}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{result.org}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{result.penalty}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}