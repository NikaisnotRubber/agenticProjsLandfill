# 工作流程編排器選項

本專案提供四種不同的工作流程編排器實現，每種都有其優缺點：

## 1. 簡單版本 (orchestrator.ts) - **推薦**
- **檔案**: `src/lib/workflow/orchestrator.ts`
- **特點**: 
  - ✅ 直接的順序執行
  - ✅ 清晰的錯誤處理
  - ✅ 詳細的日誌輸出
  - ✅ 無複雜依賴
  - ✅ 易於調試和維護

```typescript
// 使用方式
import { EmailWorkflowOrchestrator } from '../workflow/orchestrator'
```

## 2. LangGraph版本 (orchestrator-langgraph.ts)
- **檔案**: `src/lib/workflow/orchestrator-langgraph.ts`
- **特點**:
  - 🔧 使用LangGraph StateGraph
  - ⚠️ 可能有版本兼容問題
  - 📊 圖形化工作流程
  - 🔀 條件邏輯路由

```typescript
// 使用方式
import { LangGraphEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-langgraph'
```

## 3. 簡化增強版本 (orchestrator-simple.ts)
- **檔案**: `src/lib/workflow/orchestrator-simple.ts`
- **特點**:
  - ✅ 事件驅動的工作流程
  - 📝 詳細的事件日誌
  - 🔍 可測試的個別步驟
  - 📊 豐富的統計資訊
  - 🛠️ 調試友善

```typescript
// 使用方式
import { SimpleEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-simple'
```

## 4. LangGraph風格修正版本 (orchestrator-langgraph-fixed.ts) - **推薦用於學習**
- **檔案**: `src/lib/workflow/orchestrator-langgraph-fixed.ts`
- **特點**:
  - ✅ LangGraph概念實現，無類型問題
  - 📊 圖形化工作流程結構
  - 🔍 詳細的執行日誌
  - 🛠️ 工作流程驗證功能
  - 📈 圖結構可視化

```typescript
// 使用方式
import { LangGraphStyleEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-langgraph-fixed'
```

## 如何切換

在 `src/lib/email/email-manager.ts` 中修改import語句：

### 使用簡單版本（默認）
```typescript
import { EmailWorkflowOrchestrator } from '../workflow/orchestrator'
```

### 使用LangGraph版本
```typescript
import { LangGraphEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-langgraph'
```

### 使用簡化增強版本
```typescript
import { SimpleEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-simple'
```

### 使用LangGraph風格修正版本
```typescript
import { LangGraphStyleEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-langgraph-fixed'
```

## 建議

對於大多數情況，建議使用 **簡單版本** (`orchestrator.ts`)，因為：

1. **穩定性**: 無複雜的LangGraph依賴問題
2. **性能**: 直接執行，無額外開銷
3. **維護性**: 代碼清晰，易於理解和修改
4. **調試**: 簡單的錯誤追蹤和日誌

如果需要更詳細的工作流程監控和事件追蹤，可以考慮使用 **簡化增強版本** (`orchestrator-simple.ts`)。

只有在特別需要LangGraph的圖形化工作流程功能時，才建議使用 **LangGraph版本**。

## 測試

每個版本都提供相同的API接口，可以無縫切換：

```typescript
const orchestrator = new EmailWorkflowOrchestrator()
const result = await orchestrator.processEmail(initialState)
```

## 故障排除

如果遇到LangGraph相關錯誤：
1. 檢查 `@langchain/langgraph` 版本
2. 切換到簡單版本作為備用方案
3. 查看控制台日誌了解詳細錯誤信息