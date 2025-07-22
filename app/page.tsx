'use client'

import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import CaseSearch from './components/CaseSearch'
import CaseUpdate from './components/CaseUpdate'
import CaseDownload from './components/CaseDownload'
import CaseClassification from './components/CaseClassification'
import CaseUpload from './components/CaseUpload'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'search':
        return <CaseSearch />
      case 'update':
        return <CaseUpdate />
      case 'download':
        return <CaseDownload />
      case 'classification':
        return <CaseClassification />
      case 'upload':
        return <CaseUpload />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}