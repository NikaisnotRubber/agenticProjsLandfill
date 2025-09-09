import os
import re
import time
import langextract as lx
from typing import Union, Iterable, List, Dict, Iterator
from langextract.data import Document 
# To-do: add multi-modal

def _process_and_normalize(extractions, doc: Dict) -> Dict:
    """Process LangExtract results and normalize them"""
    
    metadata = {
        'code_with_comment': '',
        'import_statement': '',
        'jira_field': '', 
        'function_name': '',
    }

    # metadatas = []

    for extraction in extractions:
        if extraction.extraction_class == "import_statement":
            metadata['import_statement'] = extraction.extraction_text
        elif extraction.extraction_class == "code_with_comment":
            metadata['code_with_comment'] = extraction.extraction_text
        elif extraction.extraction_class == "jira_field":
            metadata['jira_field'] = extraction.extraction_text
        elif extraction.extraction_class == "function_name":
            metadata['function_name'] = extraction.extraction_text.lower()
        else :
            metadata[extraction.extraction_class] = extraction.extraction_text

        # metadatas.append(metadata)

    return metadata

class DocumentCollector:
    """收集文檔內容並轉換為LangExtract所需的Document對象"""
    
    def __init__(self, file_path: str, extensions: List[str]):
        self.file_path = file_path
        self.extensions = extensions
        self.documents: List[Dict] = []
  

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

    def create_langextract_document(self, file_path: str, content: str) -> Dict:
        """
        創建LangExtract Document對象
        
        :param file_path: 文件路徑
        :param content: 文件內容
        :return: LangExtract Document對象
        """
        # 使用相對路徑作為document_id，更簡潔
        relative_path = os.path.relpath(file_path, self.file_path)
        
        # 創建Document時，確保參數正確
        doc = {
            "text":content,
            "document_id":relative_path,
            
            # 可以添加metadata
            # metadata={
            #     "full_path": file_path,
            #     "extension": Path(file_path).suffix,
            #     "size": len(content)
            # }
        }
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
    def collect_documents(self) -> List[Dict]:
        """
        收集所有文檔並轉換為LangExtract Document對象
        
        :return: Document對象列表
        """
        # 清空之前的結果
        self.documents = []
        
        found_files = self.find_files_with_extensions()
        print(f"準備載入 {len(found_files)} 個檔案...")

        successful_count = 0
        
        for file_path in found_files:
            content = self.load_file_content(file_path)
            
            # 只處理非空內容
            if content and content.strip():
                try:
                    doc = self.create_langextract_document(file_path, content)
                    self.documents.append(doc)
                    successful_count += 1
                    
                    # 顯示文件內容預覽
                    preview = content[:100].replace('\n', '\\n')
                    print(f"📄 文檔創建成功: {os.path.basename(file_path)} - 預覽: {preview}...")
                    
                except Exception as e:
                    print(f"❌ 創建文檔失敗 {file_path}: {e}")
                    continue
            else:
                print(f"⚠️ 跳過空文件: {file_path}")

        print(f"\n✅ 成功處理 {successful_count}/{len(found_files)} 個文件")
        print(f"📋 總共創建 {len(self.documents)} 個Document對象")
        
        return self.documents

class Extractor:
    def __init__(self):
        print("✅ LangExtract initialized")

    def langExtractor():
        # 全局變量
        extensions = [".py", ".java", ".groovy", ".kt", ".js", ".ts", "tsx"]

        file_path = "KnowledgeBase/docs"

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
        # use ComponentAccessor.getCustomFieldManager() to initiate a manager for custumfield
        def customField = ComponentAccessor.getCustomFieldManager().getCustomFieldObject("customfield_19210")
        def projectAtr = issue.getCustomFieldValue(customField)?.toString()

        def mappingTable = [
            "Immersive Experience Creator": "Liu",
            "Opportunity Lifecycle Management": "SHIH",
            "Smart e-Learning": "Du",
        ]

        def corpStrategyVal = issue.getCustomFieldValue(corpStrategyId) as Map

        if (mappingTable.containsKey(lastVal)) {
            programManagerVal = Users.getByName(mappingTable[lastVal])
        }
        """,
                extractions=[
                    lx.data.Extraction(
                        extraction_class="code_with_comment",
                        extraction_text="# use ComponentAccessor.getCustomFieldManager() to initiate a manager for custumfield" + "def customField = ComponentAccessor.getCustomFieldManager().getCustomFieldObject(""customfield_19210"")",
                        attributes={"package": "com.atlassian.jira.component.ComponentAccessor", "usage": "use ComponentAccessor.getCustomFieldManager() to initiate a manager for custumfield"}
                    ),
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

        extracted_docs = []
        documents = DocumentCollector(file_path, extensions).collect_documents()
        data = {}
        for doc in documents:
            print(f"📄 Processing: {doc["document_id"]}")

            
            result = lx.extract(
                text_or_documents=doc["text"],
                prompt_description=prompt,
                examples=program_doc_examples,
                model_id="gemini-2.5-flash",
            )
            
            # Process and normalize extractions
            data = _process_and_normalize(result.extractions, doc)

            print(f"{data}\n")
            
            time.sleep(3)
            extracted_docs.append({
                'id': doc['document_id'],
                'content': doc['text'],
                'metadata': data
            })
        
        return extracted_docs