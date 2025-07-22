'use client'

import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  ArrowDownTrayIcon,
  TagIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const navigation = [
  { name: '概览', id: 'dashboard', icon: HomeIcon },
  { name: '案例搜索', id: 'search', icon: MagnifyingGlassIcon },
  { name: '案例更新', id: 'update', icon: ArrowPathIcon },
  { name: '案例下载', id: 'download', icon: ArrowDownTrayIcon },
  { name: '案例分类', id: 'classification', icon: TagIcon },
  { name: '案例上线', id: 'upload', icon: ArrowUpTrayIcon },
]

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <div className="bg-white w-64 shadow-sm border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cbirc-500 to-cbirc-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">CBIRC</h2>
            <p className="text-xs text-gray-500">监管分析</p>
          </div>
        </div>
      </div>
      
      <nav className="px-3 pb-6">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={clsx(
                  'w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-cbirc-50 to-cbirc-100 text-cbirc-700 border-r-2 border-cbirc-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>系统状态: <span className="text-green-500 font-medium">正常</span></p>
          <p className="mt-1">最后更新: 2小时前</p>
        </div>
      </div>
    </div>
  )
}