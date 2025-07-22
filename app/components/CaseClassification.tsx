'use client'

import { useState } from 'react'
import { TagIcon, CpuChipIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'

export default function CaseClassification() {
  const [activeTab, setActiveTab] = useState('generate')
  const [processing, setProcessing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleGenerateLabels = async () => {
    setProcessing(true)
    // Simulate API call
    setTimeout(() => {
      setProcessing(false)
    }, 3000)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const tabs = [
    { id: 'generate', name: '生成待标签案例', icon: TagIcon },
    { id: 'classify', name: '文本分类', icon: CpuChipIcon },
    { id: 'batch', name: '批量分类', icon: DocumentArrowUpIcon },
  ]

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">案例分类</h1>
        <p className="text-gray-600 mt-1">AI驱动的案例自动分类和标签生成</p>
      </div>

      {/* Tab Navigation */}
      <div className="card p-6">
        <div className="flex space-x-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-cbirc-100 text-cbirc-700 border border-cbirc-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Generate Labels Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-cbirc-100 to-cbirc-200 rounded-full flex items-center justify-center mb-4">
                <TagIcon className="h-8 w-8 text-cbirc-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">生成待标签案例</h3>
              <p className="text-gray-600 mb-6">
                系统将自动识别需要标签的案例，并生成待处理列表
              </p>
              <button
                onClick={handleGenerateLabels}
                disabled={processing}
                className="btn-primary flex items-center mx-auto"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    生成中...
                  </>
                ) : (
                  <>
                    <TagIcon className="h-4 w-4 mr-2" />
                    生成待更新案例
                  </>
                )}
              </button>
            </div>

            {processing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <div>
                    <div className="font-medium text-blue-900">正在处理案例数据</div>
                    <div className="text-sm text-blue-700">预计需要 2-3 分钟完成</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text Classification Tab */}
        {activeTab === 'classify' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">输入文本</label>
              <textarea
                className="input-field h-32 resize-none"
                placeholder="请输入需要分类的案例文本..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签列表</label>
              <textarea
                className="input-field h-24 resize-none"
                placeholder='输入标签列表，例如: ["违规放贷", "内控管理", "反洗钱", "消费者权益"]'
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="multi-label"
                className="rounded border-gray-300 text-cbirc-600 focus:ring-cbirc-500"
              />
              <label htmlFor="multi-label" className="ml-2 text-sm text-gray-700">
                多标签分类
              </label>
            </div>

            <button className="btn-primary flex items-center">
              <CpuChipIcon className="h-4 w-4 mr-2" />
              开始分类
            </button>
          </div>
        )}

        {/* Batch Classification Tab */}
        {activeTab === 'batch' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">上传文件</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="text-sm text-gray-600 mb-2">
                  点击上传或拖拽文件到此处
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  支持 CSV 格式文件，最大 10MB
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="btn-secondary cursor-pointer inline-flex items-center"
                >
                  选择文件
                </label>
              </div>
              {uploadedFile && (
                <div className="mt-2 text-sm text-gray-600">
                  已选择: {uploadedFile.name}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID字段</label>
                <select className="input-field">
                  <option>选择ID字段</option>
                  <option>id</option>
                  <option>case_id</option>
                  <option>序号</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">内容字段</label>
                <select className="input-field">
                  <option>选择内容字段</option>
                  <option>content</option>
                  <option>案情描述</option>
                  <option>处罚事由</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签列表</label>
              <textarea
                className="input-field h-24 resize-none"
                placeholder='输入标签列表，例如: ["违规放贷", "内控管理", "反洗钱", "消费者权益"]'
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="batch-multi-label"
                className="rounded border-gray-300 text-cbirc-600 focus:ring-cbirc-500"
              />
              <label htmlFor="batch-multi-label" className="ml-2 text-sm text-gray-700">
                多标签分类
              </label>
            </div>

            <button 
              className="btn-primary flex items-center"
              disabled={!uploadedFile}
            >
              <CpuChipIcon className="h-4 w-4 mr-2" />
              批量分类
            </button>
          </div>
        )}
      </div>

      {/* Classification Results */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">分类统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">1,234</div>
            <div className="text-sm text-gray-600">已分类案例</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">89%</div>
            <div className="text-sm text-gray-600">分类准确率</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">15</div>
            <div className="text-sm text-gray-600">标签类别</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">567</div>
            <div className="text-sm text-gray-600">待处理案例</div>
          </div>
        </div>
      </div>
    </div>
  )
}