import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample emails with processing results
  const email1 = await prisma.email.create({
    data: {
      subject: 'Jira登入問題',
      body: '我無法登入Jira系統，顯示權限錯誤。請幫助解決這個問題。',
      sender: 'JIMMY.HUNG@DEL.COM',
      receiver: 'support@company.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      source: 'OUTLOOK',
      priority: 'MEDIUM',
      hasLogs: false,
      processingResult: {
        create: {
          category: 'JIRA_SIMPLE',
          confidence: 0.95,
          reasoning: '用戶報告Jira登入問題，關鍵詞包含"登入"、"權限錯誤"，屬於常見的Jira簡單問題',
          keyIndicators: ['登入', 'Jira', '權限錯誤'],
          suggestedAction: 'Please check your account permissions in Jira admin console and ensure your user group has the correct access rights.',
          agentResponse: '已識別為Jira登入問題，建議檢查帳號權限設定。請確認您的帳號是否已被管理員正確配置，並檢查是否有相關的存取權限。',
          status: 'COMPLETED',
          processingTime: 2300
        }
      }
    },
    include: {
      processingResult: true
    }
  })

  const email2 = await prisma.email.create({
    data: {
      subject: 'Script Runner 錯誤 - 附log檔',
      body: 'Script Runner執行時出現錯誤，附上log檔案請協助分析。錯誤訊息顯示groovy script execution failed。',
      sender: 'SARAH.CHEN@COMPANY.COM',
      receiver: 'support@company.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      source: 'GMAIL',
      priority: 'HIGH',
      hasLogs: true,
      attachments: {
        create: [
          {
            name: 'error.log',
            content: 'Script execution failed at line 42...',
            type: 'text/plain'
          }
        ]
      },
      processingResult: {
        create: {
          category: 'JIRA_COMPLEX',
          confidence: 0.92,
          reasoning: '用戶提到Script Runner錯誤並附上log檔案，這是複雜的技術問題需要深入分析',
          keyIndicators: ['Script Runner', 'groovy', 'log檔', '錯誤'],
          suggestedAction: 'Review the groovy script for variable references and API call parameters. Update the script logic to handle null values properly.',
          agentResponse: '檢測到Script Runner相關錯誤，分析log檔後發現是groovy腳本中的變量引用問題。建議更新腳本邏輯並檢查API調用參數。',
          status: 'COMPLETED',
          processingTime: 4500
        }
      }
    },
    include: {
      processingResult: true
    }
  })

  const email3 = await prisma.email.create({
    data: {
      subject: '請問如何使用新功能',
      body: '請問新功能要怎麼使用？有說明文件嗎？我找不到相關的操作指引。',
      sender: 'ALEX.WANG@SUPPORT.COM',
      receiver: 'support@company.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      source: 'OUTLOOK',
      priority: 'LOW',
      hasLogs: false,
      processingResult: {
        create: {
          category: 'GENERAL',
          confidence: 0.78,
          reasoning: '這是關於使用方法的一般性詢問，不涉及具體的技術問題或錯誤',
          keyIndicators: ['新功能', '使用方法', '說明文件'],
          suggestedAction: 'Provide step-by-step instructions and direct the user to the relevant documentation section.',
          agentResponse: '這是一般性問題，建議參考以下操作步驟：1. 登入系統 2. 導航至功能選單 3. 按照引導完成設定',
          status: 'COMPLETED',
          processingTime: 1800
        }
      }
    },
    include: {
      processingResult: true
    }
  })

  console.log('✅ Database seeded successfully!')
  console.log(`Created emails:`)
  console.log(`- ${email1.subject} (${email1.processingResult?.category})`)
  console.log(`- ${email2.subject} (${email2.processingResult?.category})`)
  console.log(`- ${email3.subject} (${email3.processingResult?.category})`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })