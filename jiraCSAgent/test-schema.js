// 簡單測試腳本來驗證 Zod schema 修正
const { EmailSchema } = require('./src/types/email')

const testEmailWithStringDate = {
  id: 'test-123',
  subject: '測試郵件',
  body: '這是測試內容',
  sender: 'test@example.com',
  receiver: 'support@example.com',
  timestamp: '2024-01-01T10:00:00.000Z', // 字串格式的日期
  source: 'outlook',
  hasLogs: false,
  priority: 'medium'
}

const testEmailWithDateObject = {
  id: 'test-456',
  subject: '測試郵件2',
  body: '這是測試內容2',
  sender: 'test2@example.com',
  receiver: 'support@example.com',
  timestamp: new Date(), // Date 物件
  source: 'gmail',
  hasLogs: true,
  priority: 'high'
}

try {
  console.log('測試字串日期...')
  const result1 = EmailSchema.parse(testEmailWithStringDate)
  console.log('✅ 字串日期驗證成功:', result1.timestamp instanceof Date)
  
  console.log('測試 Date 物件...')
  const result2 = EmailSchema.parse(testEmailWithDateObject)
  console.log('✅ Date 物件驗證成功:', result2.timestamp instanceof Date)
  
  console.log('所有測試通過！')
} catch (error) {
  console.error('❌ 驗證失敗:', error.message)
  if (error.issues) {
    error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    })
  }
}