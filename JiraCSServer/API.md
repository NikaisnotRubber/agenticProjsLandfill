# JiraCSServer REST API Documentation

## 概述

JiraCSServer 提供 RESTful API 接口，讓外部系統可以通過 HTTP 請求提交 Jira 客服工單進行智能處理。

## 🚀 快速開始

### 啟動 API 服務器

```bash
# 開發模式（推薦用於測試）
npm run server:dev

# 生產模式
npm run server:prod

# 或使用簡化命令
npm run server
```

服務器預設運行在 `http://localhost:3000`

## 📡 API 端點

### 1. 單一工單處理

**POST** `/api/jira/process`

處理單個 Jira 客服工單，生成專業回復。

#### 請求格式

```json
{
  "forms": {
    "Project ID": "JCSC-1",
    "Issue Type": "Support Request",
    "Reporter": "USER.NAME",
    "Created": "2025/9/24 10:15",
    "Updated": "2025/9/24 10:15",
    "Summary": "無法登入Jira系統",
    "Comment": {
      "Created": "2025/9/24 10:15",
      "Updated": "2025/9/24 10:15",
      "Content": "我嘗試用我的公司帳號密碼登入，但系統一直提示「用戶名或密碼錯誤」。我確定密碼是正確的，因為其他系統都能登入。請問是我的帳號被鎖定，還是需要另外申請權限？"
    }
  }
}
```

#### 回應格式

```json
{
  "success": true,
  "data": {
    "issue_key": "JCSC-1",
    "Source": "我嘗試用我的公司帳號密碼登入，但系統",
    "comment_content": "您好，感謝您的回報！無法登入通常有以下兩種可能，請您依序嘗試：\n\n### 1. 嘗試自助密碼重設\n這通常能解決大部分的登入問題。請點擊以下連結前往密碼重設頁面：\n[➡️ **點我重設密碼**](/secure/ForgotLoginDetails.jspa)\n\n### 2. 帳號可能被鎖定\n如果重設密碼後仍然無法登入，可能是因為密碼輸入錯誤次數過多導致帳號被暫時鎖定。\n\n**我已在後台系統檢查您的帳號狀態，並已為您解除鎖定。**\n請在一分鐘後，使用您剛剛重設的密碼再次嘗試登入。\n\n---\n*💡 小提示：如果問題持續發生，請在此票券直接回覆，我會為您安排更進一步的技術支援。*",
    "workflow_id": "uuid-here",
    "processing_time": 8432,
    "classification": {
      "category": "JIRA_SIMPLE",
      "confidence": 0.95,
      "reasoning": "這是一個基本的登入問題..."
    },
    "quality_score": 87,
    "processing_steps": [
      {
        "agent": "ProblemClassificationAgent",
        "step": "classification",
        "success": true,
        "processing_time": 1200
      },
      {
        "agent": "LoginHandlerAgent",
        "step": "login_handling",
        "success": true,
        "processing_time": 6800
      }
    ]
  },
  "timestamp": "2025-09-24T10:15:30.123Z",
  "requestId": "req_1727167830123_abc123"
}
```

### 2. 批量工單處理

**POST** `/api/jira/batch`

批量處理多個工單，支援順序或並行處理。

#### 請求格式

```json
{
  "issues": [
    {
      "forms": {
        "Project ID": "JCSC-1",
        "Issue Type": "Support Request",
        "Reporter": "USER1",
        "Created": "2025/9/24 10:15",
        "Updated": "2025/9/24 10:15",
        "Summary": "登入問題",
        "Comment": {
          "Created": "2025/9/24 10:15",
          "Updated": "2025/9/24 10:15",
          "Content": "無法登入系統..."
        }
      }
    },
    {
      "forms": {
        "Project ID": "JCSC-2",
        "Issue Type": "Technical Support",
        "Reporter": "USER2",
        "Created": "2025/9/24 10:20",
        "Updated": "2025/9/24 10:20",
        "Summary": "Script Runner錯誤",
        "Comment": {
          "Created": "2025/9/24 10:20",
          "Updated": "2025/9/24 10:20",
          "Content": "腳本執行失敗..."
        }
      }
    }
  ],
  "options": {
    "parallel": false,
    "timeout": 60000,
    "retry": true
  }
}
```

#### 回應格式

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "processing_time": 15234
    },
    "results": [
      {
        "index": 0,
        "issue_key": "JCSC-1",
        "success": true,
        "workflow_id": "uuid-1",
        "processing_time": 8432,
        "data": {
          "issue_key": "JCSC-1",
          "Source": "無法登入系統...",
          "comment_content": "專業回復內容...",
          "classification": "JIRA_SIMPLE",
          "quality_score": 87
        },
        "error": null
      },
      {
        "index": 1,
        "issue_key": "JCSC-2",
        "success": true,
        "workflow_id": "uuid-2",
        "processing_time": 6802,
        "data": {
          "issue_key": "JCSC-2",
          "Source": "腳本執行失敗...",
          "comment_content": "技術支援回復...",
          "classification": "JIRA_COMPLEX",
          "quality_score": 92
        },
        "error": null
      }
    ]
  },
  "timestamp": "2025-09-24T10:25:30.456Z"
}
```

### 3. 系統健康檢查

**GET** `/api/jira/health`

檢查系統健康狀態和組件狀況。

#### 回應格式

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "components": {
      "jira_client": true,
      "workflow_graph": true,
      "agents": true
    },
    "timestamp": "2025-09-24T10:30:00.000Z",
    "uptime": 3600,
    "memory": {
      "rss": 52428800,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 1441792
    },
    "version": "v18.17.0"
  },
  "timestamp": "2025-09-24T10:30:00.000Z"
}
```

### 4. 系統資訊

**GET** `/api/jira/info`

獲取系統資訊和API限制。

#### 回應格式

```json
{
  "success": true,
  "data": {
    "service": "JiraCSServer",
    "version": "1.0.0",
    "description": "Jira Customer Service Agent Workflow System",
    "endpoints": {
      "process": "POST /api/jira/process - Process single Jira issue",
      "batch": "POST /api/jira/batch - Process multiple issues",
      "status": "GET /api/jira/status/:workflowId - Get workflow status",
      "health": "GET /api/jira/health - System health check",
      "info": "GET /api/jira/info - System information"
    },
    "limits": {
      "single_requests_per_minute": 20,
      "batch_requests_per_minute": 5,
      "max_issues_per_batch": 10,
      "max_request_size": "1MB"
    }
  },
  "timestamp": "2025-09-24T10:30:00.000Z"
}
```

### 5. 工作流狀態查詢

**GET** `/api/jira/status/:workflowId`

查詢特定工作流的處理狀態。

#### 回應格式

```json
{
  "success": true,
  "data": {
    "workflow_id": "uuid-here",
    "status": "completed",
    "timestamp": "2025-09-24T10:30:00.000Z",
    "message": "Workflow status query not implemented yet"
  },
  "timestamp": "2025-09-24T10:30:00.000Z"
}
```

## 🔐 請求驗證

### 必填字段驗證

所有請求都會進行嚴格的字段驗證：

- **Project ID**: 必須符合 `XXXX-N` 格式（如 `JCSC-1`）
- **日期格式**: 必須為 `YYYY/M/D H:MM` 格式
- **字符長度**: Summary 最多500字符，Comment Content 最多5000字符
- **內容檢查**: 自動檢測敏感信息（密碼、token等）

### 業務邏輯驗證

- Updated 時間不能早於 Created 時間
- Comment 時間不能早於 Issue 時間
- Summary 和 Comment 內容不能完全相同

### 錯誤回應格式

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "forms.Project ID",
      "message": "Project ID must be in format like \"JCSC-1\"",
      "value": "INVALID_FORMAT"
    }
  ],
  "timestamp": "2025-09-24T10:30:00.000Z"
}
```

## 🚦 速率限制

| 端點 | 限制 | 視窗 |
|------|------|------|
| `/api/jira/process` | 20 requests | 每分鐘 |
| `/api/jira/batch` | 5 requests | 每分鐘 |
| `/api/jira/status/*` | 100 requests | 每分鐘 |
| `/api/jira/info` | 50 requests | 每分鐘 |

超出限制時返回 `429 Too Many Requests` 錯誤。

## 🛠️ 使用範例

### cURL 範例

```bash
# 處理單個工單
curl -X POST http://localhost:3000/api/jira/process \
  -H "Content-Type: application/json" \
  -d '{
    "forms": {
      "Project ID": "JCSC-1",
      "Issue Type": "Support Request",
      "Reporter": "TEST.USER",
      "Created": "2025/9/24 10:15",
      "Updated": "2025/9/24 10:15",
      "Summary": "測試工單",
      "Comment": {
        "Created": "2025/9/24 10:15",
        "Updated": "2025/9/24 10:15",
        "Content": "這是一個測試工單，請協助處理。"
      }
    }
  }'

# 健康檢查
curl http://localhost:3000/api/jira/health

# 系統資訊
curl http://localhost:3000/api/jira/info
```

### JavaScript 範例

```javascript
const axios = require('axios');

async function processJiraIssue() {
  try {
    const response = await axios.post('http://localhost:3000/api/jira/process', {
      forms: {
        "Project ID": "JCSC-1",
        "Issue Type": "Support Request",
        "Reporter": "JS.USER",
        "Created": "2025/9/24 10:15",
        "Updated": "2025/9/24 10:15",
        "Summary": "JavaScript測試工單",
        "Comment": {
          "Created": "2025/9/24 10:15",
          "Updated": "2025/9/24 10:15",
          "Content": "使用JavaScript發送的測試工單。"
        }
      }
    });

    if (response.data.success) {
      console.log('工單處理成功！');
      console.log('Issue Key:', response.data.data.issue_key);
      console.log('回復內容:', response.data.data.comment_content);
    }
  } catch (error) {
    console.error('處理失敗:', error.response?.data || error.message);
  }
}

processJiraIssue();
```

### Python 範例

```python
import requests
import json

def process_jira_issue():
    url = "http://localhost:3000/api/jira/process"
    payload = {
        "forms": {
            "Project ID": "JCSC-1",
            "Issue Type": "Support Request",
            "Reporter": "PYTHON.USER",
            "Created": "2025/9/24 10:15",
            "Updated": "2025/9/24 10:15",
            "Summary": "Python測試工單",
            "Comment": {
                "Created": "2025/9/24 10:15",
                "Updated": "2025/9/24 10:15",
                "Content": "使用Python發送的測試工單。"
            }
        }
    }

    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()

        if response.json()['success']:
            print("工單處理成功！")
            data = response.json()['data']
            print(f"Issue Key: {data['issue_key']}")
            print(f"回復內容: {data['comment_content'][:100]}...")
        else:
            print("處理失敗:", response.json().get('error'))

    except requests.exceptions.RequestException as e:
        print("請求失敗:", str(e))

if __name__ == "__main__":
    process_jira_issue()
```

## 🧪 測試 API

### 自動化測試

```bash
# 啟動服務器（終端1）
npm run server:dev

# 執行API測試（終端2）
npm run test:api
```

### 手動測試步驟

1. **啟動服務器**:
   ```bash
   npm run server:dev
   ```

2. **驗證服務器運行**:
   ```bash
   curl http://localhost:3000/health
   ```

3. **測試單個工單處理**:
   使用上面的 cURL 範例或 Postman

4. **檢查回應格式**:
   確認回應包含必要的字段並符合規格

## 🔧 配置選項

### 環境變數

```bash
# 服務器配置
PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# OpenAI配置
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1

# Jira配置
JIRA_BASE_URL=https://jirastage.deltaww.com
JIRA_AUTH_TOKEN=your_auth_token

# 應用配置
NODE_ENV=production
TEST_MODE=false
LOG_LEVEL=info
```

### 安全配置

- **CORS**: 配置允許的來源域名
- **Helmet**: 自動設置安全標頭
- **速率限制**: IP級別的請求限制
- **請求大小限制**: 最大1MB請求體

## 📊 監控與日志

### 請求日志

服務器會記錄所有請求：

```
POST /api/jira/process 200 8432ms - 2548
GET /api/jira/health 200 12ms - 891
```

### 錯誤日志

詳細的錯誤信息記錄：

```json
{
  "timestamp": "2025-09-24T10:30:00.000Z",
  "method": "POST",
  "url": "/api/jira/process",
  "statusCode": 400,
  "message": "Validation failed",
  "requestId": "req_1727167830123_abc123"
}
```

### 性能指標

每個回應都包含處理時間信息，方便監控系統性能。

## 🚀 生產部署

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "server:prod"]
```

### PM2 部署

```json
{
  "name": "jiracsserver-api",
  "script": "dist/server.js",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000
  }
}
```

## 🔍 故障排除

### 常見問題

1. **服務器啟動失敗**
   - 檢查端口是否被佔用
   - 確認環境變數正確設置

2. **API 請求失敗**
   - 驗證請求格式是否正確
   - 檢查網絡連接和防火牆設置

3. **處理超時**
   - 檢查 OpenAI API 連接
   - 確認服務器資源充足

4. **速率限制錯誤**
   - 降低請求頻率
   - 實施適當的退避策略

### 調試模式

```bash
LOG_LEVEL=debug npm run server:dev
```

啟用詳細日志輸出，包括請求詳情和內部狀態。