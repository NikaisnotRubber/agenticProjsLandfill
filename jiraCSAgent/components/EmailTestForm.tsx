'use client'

import { useState } from 'react'
import { Email, EmailSource } from '@/types/email'
import { WorkflowState } from '@/types/agent'

export function EmailTestForm() {
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    sender: '',
    receiver: '',
    source: 'outlook' as EmailSource,
    hasLogs: false
  })

  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<WorkflowState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject || !formData.body || !formData.sender) {
      setError('請填寫必要欄位')
      return
    }

    setProcessing(true)
    setError(null)
    setResult(null)

    const testEmail: Email = {
      id: `test-${Date.now()}`,
      subject: formData.subject,
      body: formData.body,
      sender: formData.sender,
      receiver: formData.receiver || 'support@company.com',
      timestamp: new Date(),
      source: formData.source,
      hasLogs: formData.hasLogs,
      priority: 'medium'
    }

    try {
      const response = await fetch('/api/email/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEmail),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.result)
      } else {
        setError(data.error || '處理失敗')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '網路錯誤')
    } finally {
      setProcessing(false)
    }
  }

  const sampleEmails = [
    {
      name: 'Jira登入問題',
      data: {
        subject: '無法登入Jira系統',
        body: '您好，我今天嘗試登入Jira系統時遇到問題。輸入正確的帳號密碼後，系統顯示"認證失敗"錯誤訊息。請協助檢查我的帳號權限設定。謝謝！',
        sender: 'user@example.com',
        hasLogs: false
      }
    },
    {
      name: 'Script Runner錯誤',
      data: {
        subject: 'Script Runner執行失敗 - 急需協助',
        body: '我們的自動化腳本在今天早上開始出現錯誤。腳本嘗試更新問題狀態時失敗，錯誤訊息如下：\n\nERROR: Cannot execute script - NullPointerException at line 45\nStack trace: com.atlassian.jira.scriptrunner...\n\n請儘快協助解決，因為這影響了我們的工作流程。',
        sender: 'dev@example.com',
        hasLogs: true
      }
    },
    {
      name: '一般使用問題',
      data: {
        subject: '請問如何設定通知',
        body: '您好，我想了解如何在系統中設定電子郵件通知。我希望在任務被指派給我時收到通知，但找不到相關的設定選項。可以請您指導我嗎？',
        sender: 'support@example.com',
        hasLogs: false
      }
    }
  ]

  const loadSampleEmail = (sample: typeof sampleEmails[0]) => {
    setFormData({
      ...formData,
      ...sample.data
    })
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* 範例郵件 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">快速測試範例</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sampleEmails.map((sample) => (
            <button
              key={sample.name}
              onClick={() => loadSampleEmail(sample)}
              className="p-4 text-left border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">{sample.name}</h4>
              <p className="text-sm text-gray-600 mt-1 truncate">
                {sample.data.subject}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 測試表單 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              郵件主題 *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入郵件主題"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              寄件者 *
            </label>
            <input
              type="email"
              value={formData.sender}
              onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sender@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收件者
            </label>
            <input
              type="email"
              value={formData.receiver}
              onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="support@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              郵件來源
            </label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value as EmailSource })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="outlook">Outlook</option>
              <option value="gmail">Gmail</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            郵件內容 *
          </label>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="請輸入郵件內容..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="hasLogs"
            checked={formData.hasLogs}
            onChange={(e) => setFormData({ ...formData, hasLogs: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="hasLogs" className="ml-2 text-sm text-gray-700">
            包含日誌資訊
          </label>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? '處理中...' : '送出測試'}
        </button>
      </form>

      {/* 錯誤顯示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">錯誤: {error}</p>
        </div>
      )}

      {/* 結果顯示 */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">處理結果</h3>
          
          {/* 分類結果 */}
          {result.classification && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-2">郵件分類</h4>
              <div className="bg-gray-50 p-4 rounded">
                <p><strong>類別:</strong> {result.classification.category}</p>
                <p><strong>信心度:</strong> {(result.classification.confidence * 100).toFixed(1)}%</p>
                <p><strong>理由:</strong> {result.classification.reasoning}</p>
                <p><strong>關鍵指標:</strong> {result.classification.keyIndicators.join(', ')}</p>
                <p><strong>建議處理方式:</strong> {result.classification.suggestedAction}</p>
              </div>
            </div>
          )}

          {/* AI回應 */}
          {result.result && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-2">AI代理回應</h4>
              <div className="bg-blue-50 p-4 rounded">
                <p className="whitespace-pre-wrap">{result.result.response}</p>
              </div>
            </div>
          )}

          {/* 處理訊息 */}
          {result.messages && result.messages.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">處理流程</h4>
              <div className="space-y-2">
                {result.messages.map((message, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <span className={`inline-block w-2 h-2 rounded-full mt-2 ${
                      message.type === 'system' ? 'bg-gray-400' :
                      message.type === 'human' ? 'bg-blue-400' : 'bg-green-400'
                    }`}></span>
                    <div>
                      <p className="text-gray-600">
                        [{new Date(message.timestamp).toLocaleTimeString()}] {message.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}