# AgentiMailCS - 多智能體郵件處理系統

基於 OpenAI API 和 LangGraph 的智能郵件分類與處理系統，能自動接收、分析和處理來自 Outlook 或 Gmail 的郵件。

## 功能特色

### 🤖 多智能體協作
- **郵件分類代理**: 智能分析郵件內容並分類到預設場景
- **Jira簡單問題處理代理**: 處理登入、欄位設定、Confluence聯動等基本問題
- **Jira複雜問題處理代理**: 處理 Script Runner、外部系統整合、日誌分析等技術問題
- **一般問題處理代理**: 處理其他類型的問題

### 📧 郵件整合
- 支援 Microsoft Outlook (Graph API)
- 支援 Gmail (Google API)
- 自動輪詢新郵件
- 智能附件處理
- 日誌檢測功能

### 🎯 智能分類
系統將郵件分類為三個主要場景：
1. **Jira簡單問題**: 登入、欄位設定、Confluence聯動等
2. **Jira複雜問題**: Script Runner相關、外部系統交互、包含日誌的問題
3. **其他情況**: 不屬於上述兩個場景的問題

### 🖥️ 監控儀表板
- 即時處理狀態監控
- 服務連接狀態檢查
- 郵件處理統計
- 測試介面

## 技術架構

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **AI Framework**: LangChain + LangGraph
- **AI API**: OpenAI Compatible API
- **郵件整合**: Microsoft Graph API + Google API
- **型別安全**: Zod schema validation

## 快速開始

### 1. 安裝依賴

\`\`\`bash
npm install
\`\`\`

### 2. 環境變數設定

複製 \`.env.example\` 到 \`.env.local\` 並填入必要的配置：

\`\`\`env
# OpenAI Compatible API Configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Outlook Integration (可選)
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
OUTLOOK_TENANT_ID=your_outlook_tenant_id

# Gmail Integration (可選)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Application Settings
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here
\`\`\`

### 3. 運行開發伺服器

\`\`\`bash
npm run dev
\`\`\`

開啟 [http://localhost:3000](http://localhost:3000) 查看應用。

## 使用指南

### 郵件服務設定

#### Outlook 設定
1. 在 Azure Portal 註冊應用程序
2. 設定 Microsoft Graph API 權限
3. 獲取 Client ID、Client Secret 和 Tenant ID
4. 將憑證加入環境變數

#### Gmail 設定
1. 在 Google Cloud Console 創建專案
2. 啟用 Gmail API
3. 創建 OAuth 2.0 憑證
4. 獲取 refresh token
5. 將憑證加入環境變數

### 測試功能

1. 進入 **測試郵件** 分頁
2. 選擇預設範例或輸入自訂郵件內容
3. 點擊 **送出測試** 查看AI分析結果
4. 觀察分類結果和代理回應

### 監控系統

- **儀表板**: 查看處理統計和歷史記錄
- **服務狀態**: 監控郵件服務連接狀態
- **即時處理**: 觀察AI代理工作流程

## API 文檔

### POST /api/email/process
處理單個郵件

**Request Body:**
\`\`\`json
{
  "id": "email_id",
  "subject": "郵件主題",
  "body": "郵件內容",
  "sender": "sender@example.com",
  "receiver": "receiver@example.com",
  "timestamp": "2024-01-01T00:00:00Z",
  "source": "outlook|gmail",
  "hasLogs": false,
  "priority": "low|medium|high"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "result": {
    "classification": {
      "category": "jira_simple|jira_complex|general",
      "confidence": 0.95,
      "reasoning": "分類理由",
      "keyIndicators": ["關鍵詞"],
      "suggestedAction": "建議處理方式"
    },
    "result": {
      "action": "處理動作",
      "response": "AI回應內容",
      "status": "completed|failed|processing"
    }
  }
}
\`\`\`

### GET /api/email/process
獲取服務狀態

## 專案結構

\`\`\`
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # 全域樣式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首頁
├── components/            # React 組件
│   ├── EmailProcessingDashboard.tsx
│   ├── EmailTestForm.tsx
│   └── ServiceStatus.tsx
├── lib/                   # 核心邏輯
│   ├── agents/           # AI 代理
│   ├── email/            # 郵件服務
│   └── workflow/         # LangGraph 工作流程
└── types/                # TypeScript 型別定義
    ├── agent.ts
    └── email.ts
\`\`\`

## 開發

### 程式碼檢查
\`\`\`bash
npm run lint
\`\`\`

### 型別檢查
\`\`\`bash
npm run type-check
\`\`\`

### 建置
\`\`\`bash
npm run build
\`\`\`

## 貢獻

歡迎提交 Issue 和 Pull Request 來改善這個專案！

## 授權

MIT License