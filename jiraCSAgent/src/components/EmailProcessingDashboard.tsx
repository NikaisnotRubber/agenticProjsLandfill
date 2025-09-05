'use client'

import { useState, useEffect } from 'react'
import { WorkflowState } from '@/types/agent'
import { IntentCategory } from '@/types/email'
import { EmailDetailView } from './EmailDetailView'
import { EmailReplyComposer } from './EmailReplyComposer'
import { convertFromDbFormat } from '@/lib/database'

interface ProcessedEmail {
  id: string
  subject: string
  sender: string
  category: IntentCategory
  confidence: number
  status: 'completed' | 'failed' | 'processing'
  processedAt: Date
  processingTime: number
  agentResponse: string
  originalBody?: string
  suggestedAction?: string
}

type ViewMode = 'dashboard' | 'detail' | 'compose'

export function EmailProcessingDashboard() {
  const [processedEmails, setProcessedEmails] = useState<ProcessedEmail[]>([])
  const [selectedEmail, setSelectedEmail] = useState<ProcessedEmail | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [stats, setStats] = useState({
    total: 0,
    jiraSimple: 0,
    jiraComplex: 0,
    general: 0,
    failed: 0
  })

  // 從資料庫載入資料
  useEffect(() => {
    const loadData = async () => {
      try {
        // 載入處理結果
        const response = await fetch('/api/processing-results')
        if (response.ok) {
          const { data } = await response.json()
          
          const processedEmails: ProcessedEmail[] = data.map((result: any) => ({
            id: result.email.id,
            subject: result.email.subject,
            sender: result.email.sender,
            category: convertFromDbFormat.intentCategory(result.category) as IntentCategory,
            confidence: result.confidence,
            status: result.status.toLowerCase(),
            processedAt: new Date(result.processedAt),
            processingTime: result.processingTime,
            agentResponse: result.agentResponse,
            originalBody: result.email.body,
            suggestedAction: result.suggestedAction
          }))
          
          setProcessedEmails(processedEmails)
        }

        // 載入統計數據
        const statsResponse = await fetch('/api/processing-results/stats')
        if (statsResponse.ok) {
          const { data } = await statsResponse.json()
          setStats(data)
        }
      } catch (error) {
        console.error('載入資料失敗:', error)
        // 如果API載入失敗，仍使用模擬資料作為備選
        const mockData: ProcessedEmail[] = [
          {
            id: '1',
            subject: 'Jira登入問題',
            sender: 'JIMMY.HUNG@DEL.COM',
            category: 'jira_simple',
            confidence: 0.95,
            status: 'completed',
            processedAt: new Date(Date.now() - 1000 * 60 * 5),
            processingTime: 2300,
            agentResponse: '已識別為Jira登入問題，建議檢查帳號權限設定。',
            originalBody: '我無法登入Jira系統，顯示權限錯誤...',
            suggestedAction: 'Please check your account permissions.'
          }
        ]
        setProcessedEmails(mockData)
        setStats({
          total: 1,
          jiraSimple: 1,
          jiraComplex: 0,
          general: 0,
          failed: 0
        })
      }
    }

    loadData()
  }, [])

  const handleEmailClick = (email: ProcessedEmail) => {
    setSelectedEmail(email)
    setViewMode('detail')
  }

  const handleBackToDashboard = () => {
    setSelectedEmail(null)
    setViewMode('dashboard')
  }

  const handleRejectEmail = async (emailId: string) => {
    try {
      const response = await fetch(`/api/emails/${emailId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const updatedEmails = processedEmails.filter(email => email.id !== emailId)
        setProcessedEmails(updatedEmails)
        
        const newStats = {
          total: updatedEmails.length,
          jiraSimple: updatedEmails.filter(e => e.category === 'jira_simple').length,
          jiraComplex: updatedEmails.filter(e => e.category === 'jira_complex').length,
          general: updatedEmails.filter(e => e.category === 'general').length,
          failed: updatedEmails.filter(e => e.status === 'failed').length
        }
        setStats(newStats)
      } else {
        console.error('刪除郵件失敗')
        alert('刪除郵件失敗，請重試')
      }
    } catch (error) {
      console.error('刪除郵件失敗:', error)
      alert('刪除郵件失敗，請重試')
    }
  }

  const handleAdoptEmail = (emailId: string) => {
    setViewMode('compose')
  }

  const handleSendReply = async (emailId: string, replyContent: string, feedback: string) => {
    try {
      if (!selectedEmail) return
      
      // 找到對應的處理結果ID
      const processingResultResponse = await fetch('/api/processing-results')
      const { data: processingResults } = await processingResultResponse.json()
      const processingResult = processingResults.find((result: any) => result.email.id === emailId)
      
      if (!processingResult) {
        throw new Error('找不到對應的處理結果')
      }

      const response = await fetch('/api/email-replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processingResultId: processingResult.id,
          replyContent,
          recipientEmail: selectedEmail.sender,
          subject: `Re: ${selectedEmail.subject}`,
          feedback
        })
      })
      
      if (response.ok) {
        alert('回復已成功發送！')
        handleBackToDashboard()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || '發送失敗')
      }
    } catch (error) {
      console.error('發送回復失敗:', error)
      throw error
    }
  }

  const getCategoryColor = (category: IntentCategory) => {
    switch (category) {
      case 'jira_simple':
        return 'bg-green-100 text-green-800'
      case 'jira_complex':
        return 'bg-red-100 text-red-800'
      case 'general':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryLabel = (category: IntentCategory) => {
    switch (category) {
      case 'jira_simple':
        return 'Jira 簡單'
      case 'jira_complex':
        return 'Jira 複雜'
      case 'general':
        return '一般問題'
      default:
        return '未知'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-500">✓</span>
      case 'failed':
        return <span className="text-red-500">✗</span>
      case 'processing':
        return <span className="text-yellow-500">⟳</span>
      default:
        return <span className="text-gray-500">○</span>
    }
  }

  // 根據視圖模式渲染不同組件
  if (viewMode === 'detail' && selectedEmail) {
    return (
      <EmailDetailView
        email={selectedEmail}
        onBack={handleBackToDashboard}
        onReject={handleRejectEmail}
        onAdopt={handleAdoptEmail}
      />
    )
  }

  if (viewMode === 'compose' && selectedEmail) {
    return (
      <EmailReplyComposer
        email={selectedEmail}
        onBack={() => setViewMode('detail')}
        onSendReply={handleSendReply}
      />
    )
  }

  // 主儀表板視圖
  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">總處理數</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Jira 簡單</h3>
          <p className="text-3xl font-bold text-green-600">{stats.jiraSimple}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Jira 複雜</h3>
          <p className="text-3xl font-bold text-red-600">{stats.jiraComplex}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">一般問題</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.general}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">處理失敗</h3>
          <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
        </div>
      </div>

      {/* 郵件處理記錄 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">最近處理的郵件</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  主題
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  寄件者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分類
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  信心度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  處理時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  完成時間
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedEmails.map((email) => (
                <tr 
                  key={email.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEmailClick(email)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusIcon(email.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {email.subject}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                      {email.agentResponse}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {email.sender}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(email.category)}`}>
                      {getCategoryLabel(email.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(email.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(email.processingTime / 1000).toFixed(1)}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {email.processedAt.toLocaleTimeString('zh-TW')}
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