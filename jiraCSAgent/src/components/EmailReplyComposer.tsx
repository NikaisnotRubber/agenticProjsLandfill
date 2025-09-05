'use client'

import { useState, useEffect } from 'react'
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

interface EmailReplyComposerProps {
  email: ProcessedEmail
  onBack: () => void
  onSendReply: (emailId: string, replyContent: string, feedback: string) => void
}

export function EmailReplyComposer({ email, onBack, onSendReply }: EmailReplyComposerProps) {
  const [feedback, setFeedback] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [isSending, setIsSending] = useState(false)

  const extractFirstName = (emailAddress: string): string => {
    try {
      const localPart = emailAddress.split('@')[0]
      const namePart = localPart.split('.')[0]
      return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase()
    } catch {
      return 'User'
    }
  }

  const generateReplyContent = (email: ProcessedEmail): string => {
    const firstName = extractFirstName(email.sender)
    const greeting = `Dear ${firstName},\n\nThank you for contacting us regarding "${email.subject}".`
    
    let mainContent = ''
    
    if (email.suggestedAction) {
      mainContent = `\n\n${email.suggestedAction}`
    } else {
      switch (email.category) {
        case 'jira_simple':
          mainContent = '\n\nI have reviewed your Jira-related inquiry. Based on my analysis, here are the recommended steps to resolve your issue:\n\n' + email.agentResponse
          break
        case 'jira_complex':
          mainContent = '\n\nI have analyzed your complex Jira issue, including any logs or technical details provided. Here is my detailed assessment and recommended solution:\n\n' + email.agentResponse
          break
        case 'general':
          mainContent = '\n\nI have reviewed your inquiry and here is my response:\n\n' + email.agentResponse
          break
        default:
          mainContent = '\n\n' + email.agentResponse
      }
    }

    const closing = '\n\nIf you have any further questions or need additional assistance, please don\'t hesitate to reach out.\n\nBest regards,\nSupport Team'
    
    return greeting + mainContent + closing
  }

  useEffect(() => {
    setReplyContent(generateReplyContent(email))
  }, [email])

  const handleSendReply = async () => {
    if (!replyContent.trim()) {
      alert('請填寫回復內容')
      return
    }

    setIsSending(true)
    try {
      await onSendReply(email.id, replyContent, feedback)
    } catch (error) {
      console.error('發送回復失敗:', error)
      alert('發送回復失敗，請重試')
    } finally {
      setIsSending(false)
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          ← 返回詳情
        </button>
        <h1 className="text-2xl font-bold text-gray-900">撰寫回復郵件</h1>
        <div></div>
      </div>

      {/* Email Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">原始郵件資訊</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Feedback Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">系統回饋 (可選)</h3>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="您可以在此提供對AI處理結果的回饋，幫助改善系統表現..."
          className="w-full h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Reply Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">回復內容</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              收件人: {email.sender}
            </label>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              主題: Re: {email.subject}
            </label>
          </div>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="請輸入回復內容..."
            className="w-full h-80 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
          />
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">郵件預覽</h3>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="mb-4 text-sm text-gray-600">
            <div><strong>收件人:</strong> {email.sender}</div>
            <div><strong>主題:</strong> Re: {email.subject}</div>
            <div><strong>寄件者:</strong> Support Team</div>
          </div>
          <div className="border-t pt-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
              {replyContent}
            </pre>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
          disabled={isSending}
        >
          取消
        </button>
        <button
          onClick={handleSendReply}
          disabled={isSending || !replyContent.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSending ? '發送中...' : '確認發送'}
        </button>
      </div>
    </div>
  )
}