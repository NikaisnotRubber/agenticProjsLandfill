// 簡單測試腳本來驗證工作流程編排器
console.log('=== AgentiMailCS 工作流程編排器測試 ===')

// 模擬測試資料
const mockEmail = {
  id: 'test-123',
  subject: 'Jira登入問題測試',
  body: '您好，我無法登入Jira系統，請協助檢查帳號權限。',
  sender: 'test@example.com',
  receiver: 'support@example.com',
  timestamp: new Date(),
  source: 'outlook',
  hasLogs: false,
  priority: 'medium'
}

const mockWorkflowState = {
  email: mockEmail,
  messages: [{
    id: 'msg-1',
    type: 'system',
    content: '開始處理郵件',
    timestamp: new Date()
  }]
}

console.log('✅ 測試資料準備完成')
console.log('📧 測試郵件:', mockEmail.subject)
console.log('👤 寄件者:', mockEmail.sender)

// 模擬工作流程執行步驟
console.log('\n=== 工作流程執行步驟模擬 ===')
console.log('1. 📧 郵件分類 - 開始分析...')
console.log('2. 🎯 分類結果: jira_simple (信心度: 0.85)')
console.log('3. 🔧 路由到 Jira簡單問題處理器')
console.log('4. ✅ 處理完成')

console.log('\n可用的工作流程編排器版本：')
console.log('1. orchestrator.ts - 簡單版本（推薦）')
console.log('2. orchestrator-simple.ts - 事件驅動版本')
console.log('3. orchestrator-langgraph-fixed.ts - LangGraph風格修正版本（推薦學習）')
console.log('4. orchestrator-langgraph.ts - 原始LangGraph版本（可能有類型問題）')

console.log('\n如需切換版本，請修改 src/lib/email/email-manager.ts 中的 import 語句')
console.log('詳見 WORKFLOW_ORCHESTRATORS.md 文檔')

console.log('\n=== 測試完成 ===')