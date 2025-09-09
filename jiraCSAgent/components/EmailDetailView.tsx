'use client'

import { useState } from 'react'
import { IntentCategory } from '@/types/email'

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

interface EmailDetailViewProps {
  email: ProcessedEmail
  onBack: () => void
  onReject: (emailId: string) => void
  onAdopt: (emailId: string) => void
}

export function EmailDetailView({ email, onBack, onReject, onAdopt }: EmailDetailViewProps) {
  const [showConfirmReject, setShowConfirmReject] = useState(false)

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

  const handleReject = () => {
    if (showConfirmReject) {
      onReject(email.id)
      onBack()
    } else {
      setShowConfirmReject(true)
    }
  }

  const handleAdopt = () => {
    onAdopt(email.id)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          ← 返回列表
        </button>
        <h1 className="text-2xl font-bold text-gray-900">郵件處理詳情</h1>
        <div></div>
      </div>

      {/* Email Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本資訊</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">主題</label>
                <p className="text-gray-900">{email.subject}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">寄件者</label>
                <p className="text-gray-900">{email.sender}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">分類</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(email.category)}`}>
                  {getCategoryLabel(email.category)}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">處理資訊</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">信心度</label>
                <p className="text-gray-900">{(email.confidence * 100).toFixed(1)}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">處理時間</label>
                <p className="text-gray-900">{(email.processingTime / 1000).toFixed(1)}秒</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">完成時間</label>
                <p className="text-gray-900">{email.processedAt.toLocaleString('zh-TW')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Result */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">AI 處理結果</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-800 whitespace-pre-wrap">{email.agentResponse}</p>
        </div>
      </div>

      {/* Suggested Action */}
      {email.suggestedAction && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">建議處理方式</h3>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-800">{email.suggestedAction}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">處理決定</h3>
        <div className="flex space-x-4">
          <button
            onClick={handleReject}
            className={`px-6 py-2 rounded-md font-medium ${
              showConfirmReject
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {showConfirmReject ? '確認否決' : '否決'}
          </button>
          <button
            onClick={handleAdopt}
            className="px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700"
          >
            採納
          </button>
          {showConfirmReject && (
            <button
              onClick={() => setShowConfirmReject(false)}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
            >
              取消
            </button>
          )}
        </div>
        {showConfirmReject && (
          <p className="text-red-600 text-sm mt-2">
            確認否決將會刪除此處理記錄並返回主頁面
          </p>
        )}
      </div>
    </div>
  )
}