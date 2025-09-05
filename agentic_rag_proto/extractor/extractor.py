import os
import re
import langextract as lx
from typing import Union, Iterable, List, Dict, Iterator
from langextract.data import Document 


class DocumentCollector:
    """收集文檔內容並轉換為LangExtract所需的Document對象"""
    
    def __init__(self, file_path: str, extensions: List[str]):
        self.file_path = file_path
        self.extensions = extensions
        self.documents: Iterator[Document]
    
    def _enhanced_regex_extraction(self, documents: List[Dict]) -> List[Dict]:
        """Enhanced regex-based extraction with better patterns"""
        
        extracted_docs = []
        
        for doc in documents:
            metadata = {
                'service': 'unknown',
                'version': 'unknown',
                'doc_type': 'reference', 
                'rate_limits': [],
                'deprecated': False
            }
            
            title = doc.get('title', '')
            content = doc['content']
            
            # Extract service name from title
            service_match = re.search(r'([\w\s]+(?:API|Service))', title)
            if service_match:
                metadata['service'] = service_match.group(1).strip()
            
            # Extract version number
            version_match = re.search(r'v?([\d.]+)', title)
            if version_match:
                metadata['version'] = version_match.group(1)
            
            # Determine document type
            if 'troubleshooting' in title.lower():
                metadata['doc_type'] = 'troubleshooting'
            elif 'guide' in title.lower():
                metadata['doc_type'] = 'guide'
            else:
                metadata['doc_type'] = 'reference'
            
            # Extract rate limits
            rate_matches = re.findall(r'(\d+)\s*(?:requests?|req)[/\s]*(?:per\s*)?min', content.lower())
            metadata['rate_limits'] = [f"{r} req/min" for r in rate_matches]
            
            # Check for deprecation
            if 'deprecated' in content.lower():
                metadata['deprecated'] = True
            
            extracted_docs.append({
                'id': doc['id'],
                'title': doc['title'], 
                'content': doc['content'],
                'metadata': metadata
            })
        
        return extracted_docs

    def find_files_with_extensions(self) -> List[str]:
        """
        遞歸查找指定副檔名的文件
        
        :return: 找到的文件路徑列表
        """
        found_files = []

        if not os.path.isdir(self.file_path):
            raise FileNotFoundError(f"找不到目錄: {os.path.abspath(self.file_path)}")

        for dirpath, _, filenames in os.walk(self.file_path):
            for filename in filenames:
                if any(filename.endswith(ext) for ext in self.extensions):
                    file_path = os.path.join(dirpath, filename)
                    found_files.append(file_path)
                    print(f"找到文件: {file_path}")

        print(f"找到程式文件共 {len(found_files)} 個。")
        return found_files

    def load_file_content(self, file_path: str) -> str:
        """
        安全地載入單個文件內容
        
        :param file_path: 文件路徑
        :return: 文件內容，出錯時返回空字符串
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                print(f"✅ 成功載入: {file_path} ({len(content)} 字符)")
                return content
        except UnicodeDecodeError:
            # 嘗試其他編碼
            try:
                with open(file_path, 'r', encoding='gbk') as f:
                    content = f.read()
                    print(f"✅ 成功載入 (GBK編碼): {file_path}")
                    return content
            except Exception as e:
                print(f"❌ 編碼錯誤: {file_path} - {e}")
                return ""
        except FileNotFoundError:
            print(f"❌ 找不到檔案: {file_path}")
            return ""
        except PermissionError:
            print(f"❌ 沒有權限讀取檔案: {file_path}")
            return ""
        except Exception as e:
            print(f"❌ 讀取檔案 {file_path} 時發生錯誤: {e}")
            return ""

    def create_langextract_document(self, file_path: str, content: str) -> Document:
        """
        創建LangExtract Document對象
        
        :param file_path: 文件路徑
        :param content: 文件內容
        :return: LangExtract Document對象
        """
        # 使用相對路徑作為document_id，更簡潔
        relative_path = os.path.relpath(file_path, self.file_path)
        
        # 創建Document時，確保參數正確
        doc = Document(
            text=content,
            document_id=relative_path,
            
            # 可以添加metadata
            # metadata={
            #     "full_path": file_path,
            #     "extension": Path(file_path).suffix,
            #     "size": len(content)
            # }
        )
        return doc

    def collect_documents_as_text(self) -> str:
        """
        收集所有文檔並合併為單一長文本，使用相對路徑作為篇章標記
        
        :return: 合併後的文本內容
        """        
        found_files = self.find_files_with_extensions()
        print(f"準備載入 {len(found_files)} 個檔案...")

        successful_count = 0
        combined_text = ""
        
        for file_path in found_files:
            content = self.load_file_content(file_path)
            
            # 只處理非空內容
            if content and content.strip():
                try:
                    relative_path = os.path.relpath(file_path, self.file_path)
                    successful_count += 1
                    
                    # 添加文件路徑標記和內容
                    combined_text += f"\n\n=== FILE: {relative_path} ===\n\n"
                    combined_text += content
                    
                    # 顯示文件內容預覽
                    preview = content[:100].replace('\n', '\\n')
                    print(f"📄 文檔載入成功: {os.path.basename(file_path)} - 預覽: {preview}...")
                    
                except Exception as e:
                    print(f"❌ 載入文檔失敗 {file_path}: {e}")
                    continue
            else:
                print(f"⚠️ 跳過空文件: {file_path}")

        print(f"\n✅ 成功處理 {successful_count} 個文件")
        print(f"📋 合併文本長度: {len(combined_text)} 字符")
        
        return combined_text


# 全局變量
extensions = [".py", ".java", ".groovy", ".kt", ".js", ".ts", "tsx"]

file_path = "../docs"

prompt = """ 
# 程式碼知識提取Agent

## 任務
從程式碼中提取結構化知識，支援Java(Spring Boot)、Groovy(Jira Script Runner)、Python、Go、JS/TS、Ruby開發。

## 文件格式說明
輸入文本使用 `=== FILE: {relative_path} ===` 標記分隔不同文件，請在提取時注意文件來源並在attributes中包含文件路徑信息。

## 輸出格式

### 函數/類別
```markdown
**[語言] 名稱**: `ClassName` 或 `functionName`
**用途**: 簡潔功能描述
**參數**: param: Type - 說明
**返回值**: ReturnType - 說明  
**特殊標記**: @注解、裝飾器等
**文件來源**: 相對文件路徑
**使用範例**:
```[language]
// 實際可執行的程式碼範例
```
**注意事項**: 重要限制或配置需求
```

### 配置項目
```markdown
**配置**: `CONFIG_NAME`
**類型**: type | 預設值
**用途**: 配置作用
**文件來源**: 相對文件路徑
**設定**:
```
# 環境變數或配置文件設定方式
```
```

## 語言特定重點

- **Java/Spring**: @Component/@Service/@Controller、依賴注入、application.yml
- **Groovy/Jira**: ComponentAccessor使用、Issue操作、自定義欄位
- **Python**: Type hints、裝飾器、異常處理
- **Go**: interface、error handling、struct tags
- **JS/TS**: async/await、型別定義、模組導入
- **Ruby**: ActiveRecord關聯、gem依賴、方法定義

## 處理流程

1. **識別**: "[檢測語言] + [框架] + [文件路徑]"
2. **提取**: 按格式提取關鍵API和配置，包含文件來源
3. **驗證**: 確保程式碼範例可執行
4. **總結**: "提取完成: X個API, Y個配置"

## 品質要求

- 函數簽名必須準確
- 程式碼範例符合語言慣例
- 標註版本差異（如Spring Boot 2/3）
- 必須在attributes中包含file_path信息
- 不確定時標記 `[需驗證]`
"""

# Example for program documentation data extraction
program_doc_examples = [
    lx.data.ExampleData(
        text="""
=== FILE: scripts/jira/fieldManager.groovy ===

import com.atlassian.jira.component.ComponentAccessor
import com.atlassian.jira.issue.CustomFieldManager

def customField = ComponentAccessor.getCustomFieldManager().getCustomFieldObject("customfield_19210")
def projectAtr = issue.getCustomFieldValue(customField)?.toString()

def mappingTable = [
    "Immersive Experience Creator": "Singyu.Liu",
    "Opportunity Lifecycle Management": "SAM.SHIH",
    "Smart e-Learning": "Hongyi.Du",
]

def corpStrategyVal = issue.getCustomFieldValue(corpStrategyId) as Map

if (mappingTable.containsKey(lastVal)) {
    programManagerVal = Users.getByName(mappingTable[lastVal])
}
""",
        extractions=[
            lx.data.Extraction(
                extraction_class="import_statement",
                extraction_text="import com.atlassian.jira.component.ComponentAccessor",
                attributes={"package": "com.atlassian.jira.component.ComponentAccessor", "file_path": "scripts/jira/fieldManager.groovy"}
            ),
            lx.data.Extraction(
                extraction_class="jira_field",
                extraction_text="customfield_19210",
                attributes={"field_type": "custom_field", "usage": "project attribute", "file_path": "scripts/jira/fieldManager.groovy"}
            ),
            lx.data.Extraction(
                extraction_class="function_name",
                extraction_text="getCustomFieldObject",
                attributes={"context": "accessing Jira custom field", "file_path": "scripts/jira/fieldManager.groovy"}
            ),
            lx.data.Extraction(
                extraction_class="configuration_parameter",
                extraction_text="mappingTable",
                attributes={"type": "key-value mapping", "purpose": "program manager assignment", "file_path": "scripts/jira/fieldManager.groovy"}
            ),
        ]
    )
]

combined_text = DocumentCollector(file_path=file_path, extensions=extensions).collect_documents_as_text()

print(f"合併文本準備完成，開始進行知識提取...")
try: 
    result = lx.extract(
        text_or_documents=combined_text,
        prompt_description=prompt,
        examples=program_doc_examples,
        model_id="gemini-2.5-flash",  # Automatically selects OpenAI provider
        api_key=os.environ.get('GEMINI_API_KEY'),

        # model_id=os.environ.get('OPENAI_MODEL', 'delta-agentic-coding'),  # Automatically selects OpenAI provider
        # api_key=os.environ.get('OPENAI_API_KEY'),
        # model_url=os.environ.get('OPENAI_BASE_URL'),
        max_workers=16,
        fence_output=False,
        use_schema_constraints=True
    )
    print("切分結果的前十個切塊是：")
    for res in result.extractions[:5]:
        print(f"{res}\n")
except Exception as e:
    print(f"❌ 錯誤: {e}")
