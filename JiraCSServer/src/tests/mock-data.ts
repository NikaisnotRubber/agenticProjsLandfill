import { JiraIssueInput } from '../types';

export const mockJiraIssues: JiraIssueInput[] = [
  {
    forms: {
      "Project ID": "JCSC-1",
      "Issue Type": "Support Request",
      "Reporter": "PETER.W.WANG",
      "Created": "2025/9/22 10:15",
      "Updated": "2025/9/23 09:20",
      "Summary": "無法登入Jira系統",
      "Comment": {
        "Created": "2025/9/23 09:20",
        "Updated": "2025/9/23 09:20",
        "Content": "我嘗試用我的公司帳號密碼登入，但系統一直提示「用戶名或密碼錯誤」。我確定密碼是正確的，因為其他系統都能登入。請問是我的帳號被鎖定，還是需要另外申請權限？"
      }
    }
  },
  {
    forms: {
      "Project ID": "JCSC-2",
      "Issue Type": "Technical Support",
      "Reporter": "ADMIN.USER",
      "Created": "2025/9/22 14:30",
      "Updated": "2025/9/23 10:15",
      "Summary": "Script Runner 自動化流程執行失敗",
      "Comment": {
        "Created": "2025/9/23 10:15",
        "Updated": "2025/9/23 10:15",
        "Content": "我們的Script Runner自動化流程在處理工單狀態轉換時出現錯誤。錯誤日誌顯示'NullPointerException at line 45'。這個腳本是用來自動分配責任人並發送通知郵件的，但現在完全無法運作。需要技術人員協助分析腳本代碼和系統日誌。"
      }
    }
  },
  {
    forms: {
      "Project ID": "JCSC-3",
      "Issue Type": "General Inquiry",
      "Reporter": "MARY.CHEN",
      "Created": "2025/9/23 11:00",
      "Updated": "2025/9/23 11:00",
      "Summary": "申請Jira進階培訓課程",
      "Comment": {
        "Created": "2025/9/23 11:00",
        "Updated": "2025/9/23 11:00",
        "Content": "我想要參加公司的Jira進階培訓課程，想了解課程內容、時間安排和報名方式。另外也想知道是否有線上學習資源可以先自學基礎功能。"
      }
    }
  },
  {
    forms: {
      "Project ID": "JCSC-4",
      "Issue Type": "Permission Request",
      "Reporter": "JOHN.DOE",
      "Created": "2025/9/23 13:45",
      "Updated": "2025/9/23 13:45",
      "Summary": "無法查看專案看板",
      "Comment": {
        "Created": "2025/9/23 13:45",
        "Updated": "2025/9/23 13:45",
        "Content": "我剛加入新團隊，但發現無法查看團隊的Jira專案看板。點擊專案連結時出現「權限不足」的錯誤訊息。請幫忙確認我的帳號權限設定。"
      }
    }
  },
  {
    forms: {
      "Project ID": "JCSC-5",
      "Issue Type": "Technical Support",
      "Reporter": "TECH.LEAD",
      "Created": "2025/9/23 15:20",
      "Updated": "2025/9/23 15:20",
      "Summary": "自定義欄位配置問題",
      "Comment": {
        "Created": "2025/9/23 15:20",
        "Updated": "2025/9/23 15:20",
        "Content": "需要在工單中新增一個下拉選單的自定義欄位，但在配置畫面中找不到相關設定選項。另外也想了解如何設定欄位的預設值和必填驗證規則。"
      }
    }
  },
  {
    forms: {
      "Project ID": "JCSC-6",
      "Issue Type": "Integration Issue",
      "Reporter": "SYSTEM.ADMIN",
      "Created": "2025/9/23 16:00",
      "Updated": "2025/9/23 16:00",
      "Summary": "LDAP整合認證失敗",
      "Comment": {
        "Created": "2025/9/23 16:00",
        "Updated": "2025/9/23 16:00",
        "Content": "公司LDAP系統與Jira的整合出現問題，用戶無法使用AD帳號登入。錯誤日誌顯示連線逾時，但網路連線正常。需要檢查LDAP設定和連線參數。伺服器IP: 192.168.1.100，Port: 389。"
      }
    }
  },
  {
    forms: {
      "Project ID": "JCSC-7",
      "Issue Type": "Performance Issue",
      "Reporter": "DEV.TEAM",
      "Created": "2025/9/23 17:30",
      "Updated": "2025/9/23 17:30",
      "Summary": "系統回應速度緩慢",
      "Comment": {
        "Created": "2025/9/23 17:30",
        "Updated": "2025/9/23 17:30",
        "Content": "最近Jira系統的回應速度變得很慢，特別是在載入大型專案的看板時。有時候需要等待30秒以上才能完全載入。這個問題在下午時段特別嚴重，影響團隊的工作效率。"
      }
    }
  },
  {
    forms: {
      "Project ID": "JCSC-8",
      "Issue Type": "Feature Request",
      "Reporter": "PRODUCT.MANAGER",
      "Created": "2025/9/23 18:00",
      "Updated": "2025/9/23 18:00",
      "Summary": "希望增加批量操作功能",
      "Comment": {
        "Created": "2025/9/23 18:00",
        "Updated": "2025/9/23 18:00",
        "Content": "我們團隊經常需要同時修改多個工單的狀態或指派人員。目前需要一個一個點擊修改很耗時。希望能增加批量選取和批量操作的功能，提高工作效率。"
      }
    }
  }
];

export const expectedClassifications: Record<string, string> = {
  'JCSC-1': 'JIRA_SIMPLE', // Login issue
  'JCSC-2': 'JIRA_COMPLEX', // Script Runner technical issue
  'JCSC-3': 'GENERAL', // Training request
  'JCSC-4': 'JIRA_SIMPLE', // Permission issue
  'JCSC-5': 'JIRA_SIMPLE', // Custom field configuration
  'JCSC-6': 'JIRA_COMPLEX', // LDAP integration
  'JCSC-7': 'JIRA_COMPLEX', // Performance issue
  'JCSC-8': 'GENERAL', // Feature request
};

export const mockResponses = {
  'JCSC-1': {
    expected_source: "我嘗試用我的公司帳號密碼登入，但系統",
    should_contain: ['密碼重設', '帳號鎖定', '登入'],
  },
  'JCSC-2': {
    expected_source: "我們的Script Runner自動化流程",
    should_contain: ['Script Runner', '腳本', '日誌'],
  },
  'JCSC-3': {
    expected_source: "我想要參加公司的Jira進階培訓課程",
    should_contain: ['培訓', '課程', '學習'],
  },
};

export const testScenarios = [
  {
    name: 'Simple Login Issue',
    input: mockJiraIssues[0],
    expectedCategory: 'JIRA_SIMPLE',
    expectedAgent: 'LoginHandlerAgent',
    description: 'Test basic login problem handling',
  },
  {
    name: 'Complex Technical Issue',
    input: mockJiraIssues[1],
    expectedCategory: 'JIRA_COMPLEX',
    expectedAgent: 'ComplexHandlerAgent',
    description: 'Test Script Runner technical problem handling',
  },
  {
    name: 'General Training Request',
    input: mockJiraIssues[2],
    expectedCategory: 'GENERAL',
    expectedAgent: 'GeneralHandlerAgent',
    description: 'Test general inquiry handling',
  },
  {
    name: 'Permission Issue',
    input: mockJiraIssues[3],
    expectedCategory: 'JIRA_SIMPLE',
    expectedAgent: 'LoginHandlerAgent',
    description: 'Test permission-related problem handling',
  },
];

export function getRandomTestCase(): { input: JiraIssueInput; expected: string } {
  const randomIndex = Math.floor(Math.random() * mockJiraIssues.length);
  const input = mockJiraIssues[randomIndex];
  const expected = expectedClassifications[input.forms["Project ID"]];

  return { input, expected };
}

export function getAllTestCases(): Array<{ input: JiraIssueInput; expected: string }> {
  return mockJiraIssues.map(input => ({
    input,
    expected: expectedClassifications[input.forms["Project ID"]],
  }));
}