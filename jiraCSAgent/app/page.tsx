'use client'

import { useState, useEffect } from 'react'
import { EmailProcessingDashboard } from '@/components/EmailProcessingDashboard'
import { EmailTestForm } from '@/components/EmailTestForm'
import { ServiceStatus } from '@/components/ServiceStatus'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'test' | 'status'>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                AgentiMailCS
              </h1>
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                多智能體郵件處理系統
              </span>
            </div>
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'dashboard' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                儀表板
              </button>
              <button
                onClick={() => setActiveTab('test')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'test' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                測試郵件
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'status' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                服務狀態
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">郵件處理監控</h2>
            <EmailProcessingDashboard />
          </div>
        )}

        {activeTab === 'test' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">郵件處理測試</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 mb-6">
                在此測試郵件分類和多智能體處理功能。輸入模擬郵件內容，系統將展示完整的處理流程。
              </p>
              <EmailTestForm />
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">系統服務狀態</h2>
            <ServiceStatus />
          </div>
        )}
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            AgentiMailCS - 基於 OpenAI API 和 LangGraph 的多智能體郵件處理系統
          </p>
        </div>
      </footer>
    </div>
  )
}