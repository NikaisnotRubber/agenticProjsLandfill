'use client'

import { useState, useEffect } from 'react'

interface ServiceStatusData {
  outlook?: { authenticated: boolean; polling: boolean }
  gmail?: { authenticated: boolean; polling: boolean }
}

interface StatsData {
  enabledServices: string[]
  isProcessing: boolean
  serviceCount: number
}

export function ServiceStatus() {
  const [status, setStatus] = useState<ServiceStatusData>({})
  const [stats, setStats] = useState<StatsData>({
    enabledServices: [],
    isProcessing: false,
    serviceCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/email/process')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setStatus(data.status || {})
        setStats(data.stats || { enabledServices: [], isProcessing: false, serviceCount: 0 })
        setLastUpdated(new Date())
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入狀態失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // 每30秒自動更新狀態
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (authenticated: boolean, polling: boolean) => {
    if (authenticated && polling) {
      return <span className="text-green-500 text-xl">●</span>
    } else if (authenticated) {
      return <span className="text-yellow-500 text-xl">●</span>
    } else {
      return <span className="text-red-500 text-xl">●</span>
    }
  }

  const getStatusText = (authenticated: boolean, polling: boolean) => {
    if (authenticated && polling) {
      return { text: '運行中', color: 'text-green-600' }
    } else if (authenticated) {
      return { text: '已連接', color: 'text-yellow-600' }
    } else {
      return { text: '未連接', color: 'text-red-600' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">載入中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">錯誤: {error}</p>
          <button
            onClick={fetchStatus}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            重新載入
          </button>
        </div>
      )}

      {/* 系統總覽 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">系統總覽</h3>
          <button
            onClick={fetchStatus}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            重新整理
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.serviceCount}</div>
            <div className="text-sm text-gray-500">已配置服務</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${stats.isProcessing ? 'text-green-600' : 'text-gray-400'}`}>
              {stats.isProcessing ? '●' : '○'}
            </div>
            <div className="text-sm text-gray-500">
              {stats.isProcessing ? '處理中' : '待機中'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.enabledServices.length}</div>
            <div className="text-sm text-gray-500">啟用服務</div>
          </div>
        </div>
      </div>

      {/* 郵件服務狀態 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">郵件服務狀態</h3>
        
        <div className="space-y-4">
          {/* Outlook 服務 */}
          {status.outlook !== undefined ? (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(status.outlook.authenticated, status.outlook.polling)}
                <div>
                  <h4 className="font-medium text-gray-900">Microsoft Outlook</h4>
                  <p className="text-sm text-gray-500">Microsoft Graph API 整合</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-medium ${getStatusText(status.outlook.authenticated, status.outlook.polling).color}`}>
                  {getStatusText(status.outlook.authenticated, status.outlook.polling).text}
                </div>
                <div className="text-sm text-gray-500">
                  {status.outlook.authenticated ? '已認證' : '未認證'} • 
                  {status.outlook.polling ? ' 輪詢中' : ' 待機'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg opacity-50">
              <div className="flex items-center space-x-3">
                <span className="text-gray-400 text-xl">○</span>
                <div>
                  <h4 className="font-medium text-gray-500">Microsoft Outlook</h4>
                  <p className="text-sm text-gray-400">未配置</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-400">未啟用</div>
                <div className="text-sm text-gray-400">需要設定環境變數</div>
              </div>
            </div>
          )}

          {/* Gmail 服務 */}
          {status.gmail !== undefined ? (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(status.gmail.authenticated, status.gmail.polling)}
                <div>
                  <h4 className="font-medium text-gray-900">Gmail</h4>
                  <p className="text-sm text-gray-500">Google API 整合</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-medium ${getStatusText(status.gmail.authenticated, status.gmail.polling).color}`}>
                  {getStatusText(status.gmail.authenticated, status.gmail.polling).text}
                </div>
                <div className="text-sm text-gray-500">
                  {status.gmail.authenticated ? '已認證' : '未認證'} • 
                  {status.gmail.polling ? ' 輪詢中' : ' 待機'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg opacity-50">
              <div className="flex items-center space-x-3">
                <span className="text-gray-400 text-xl">○</span>
                <div>
                  <h4 className="font-medium text-gray-500">Gmail</h4>
                  <p className="text-sm text-gray-400">未配置</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-400">未啟用</div>
                <div className="text-sm text-gray-400">需要設定環境變數</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI 代理狀態 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">AI 代理狀態</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-green-500 text-sm">●</span>
              <h4 className="font-medium">郵件分類器</h4>
            </div>
            <p className="text-sm text-gray-600">自動分析郵件內容並分類</p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-green-500 text-sm">●</span>
              <h4 className="font-medium">Jira 簡單處理</h4>
            </div>
            <p className="text-sm text-gray-600">處理登入、設定等基本問題</p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-green-500 text-sm">●</span>
              <h4 className="font-medium">Jira 複雜處理</h4>
            </div>
            <p className="text-sm text-gray-600">處理 Script Runner 和系統整合</p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-green-500 text-sm">●</span>
              <h4 className="font-medium">一般問題處理</h4>
            </div>
            <p className="text-sm text-gray-600">處理其他類型的問題</p>
          </div>
        </div>
      </div>

      {/* 最後更新時間 */}
      {lastUpdated && (
        <div className="text-center text-sm text-gray-500">
          最後更新: {lastUpdated.toLocaleString('zh-TW')}
        </div>
      )}
    </div>
  )
}