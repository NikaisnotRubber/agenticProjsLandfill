#!/usr/bin/env python3
"""
Graphiti Bridge - Python服務橋接腳本
用於在TypeScript/JavaScript應用中調用Python Graphiti功能

Usage:
    python graphiti_bridge.py <method> < payload.json

Environment Variables:
    NEO4J_URI: Neo4j連接URI (default: bolt://localhost:7687)
    NEO4J_USER: Neo4j用戶名 (default: neo4j) 
    NEO4J_PASSWORD: Neo4j密碼 (default: test1234)
    OPENAI_API_KEY: OpenAI API密鑰
    OPENAI_MODEL: OpenAI模型名稱 (default: gpt-4-turbo-preview)
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)

try:
    from graphiti_core import Graphiti
    from graphiti_core.nodes import EpisodeType
    from graphiti_core.utils.maintenance.graph_data_operations import clear_data
    from graphiti_core.search.search_config_recipes import NODE_HYBRID_SEARCH_EPISODE_MENTIONS
except ImportError as e:
    logger.error(f"無法導入Graphiti核心模塊: {e}")
    logger.error("請確保已安裝: pip install graphiti-core")
    sys.exit(1)

class GraphitiBridge:
    """Graphiti服務橋接類"""
    
    def __init__(self):
        self.client: Optional[Graphiti] = None
        self._initialize_client()
    
    def _initialize_client(self):
        """初始化Graphiti客戶端"""
        try:
            neo4j_uri = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')
            neo4j_user = os.environ.get('NEO4J_USER', 'neo4j')
            neo4j_password = os.environ.get('NEO4J_PASSWORD', 'test1234')
            
            logger.info(f"初始化Graphiti客戶端: {neo4j_uri}")
            
            self.client = Graphiti(
                neo4j_uri,
                neo4j_user, 
                neo4j_password
            )
            
            logger.info("✅ Graphiti客戶端初始化成功")
            
        except Exception as e:
            logger.error(f"❌ 初始化Graphiti客戶端失敗: {e}")
            raise
    
    async def add_episode(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """添加episode到知識圖譜"""
        try:
            name = payload.get('name', '')
            episode_body = payload.get('episode_body', '')
            source = payload.get('source', 'json')
            source_description = payload.get('source_description', '')
            reference_time_str = payload.get('reference_time', datetime.now(timezone.utc).isoformat())
            metadata = payload.get('metadata', {})
            
            # 轉換時間格式
            if isinstance(reference_time_str, str):
                reference_time = datetime.fromisoformat(reference_time_str.replace('Z', '+00:00'))
            else:
                reference_time = datetime.now(timezone.utc)
            
            # 轉換episode類型
            episode_type_mapping = {
                'text': EpisodeType.text,
                'message': EpisodeType.message,
                'json': EpisodeType.json,
                'event': EpisodeType.event
            }
            episode_source = episode_type_mapping.get(source, EpisodeType.json)
            
            logger.info(f"添加Episode: {name[:50]}...")
            logger.info(f"數據大小: {len(episode_body)} 字符")
            
            await self.client.add_episode(
                name=name,
                episode_body=episode_body,
                source=episode_source,
                source_description=source_description,
                reference_time=reference_time
            )
            
            return {
                'success': True,
                'message': f'Episode添加成功: {name}',
                'episode_name': name
            }
            
        except Exception as e:
            logger.error(f"添加Episode失敗: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def search(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """搜索知識圖譜"""
        try:
            query = payload.get('query', '')
            num_results = payload.get('num_results', 10)
            center_node_uuid = payload.get('center_node_uuid')
            
            logger.info(f"搜索查詢: {query}")
            
            search_results = await self.client.search(
                query=query,
                center_node_uuid=center_node_uuid,
                num_results=num_results
            )
            
            # 轉換結果格式
            formatted_results = []
            if hasattr(search_results, '__iter__'):
                for result in search_results:
                    if hasattr(result, 'fact'):
                        formatted_results.append({
                            'fact': result.fact,
                            'source': getattr(result, 'source', None),
                            'target': getattr(result, 'target', None),
                            'weight': getattr(result, 'weight', None)
                        })
                    else:
                        formatted_results.append(str(result))
            
            return {
                'success': True,
                'query': query,
                'results': formatted_results,
                'count': len(formatted_results)
            }
            
        except Exception as e:
            logger.error(f"搜索失敗: {e}")
            return {
                'success': False,
                'error': str(e),
                'results': []
            }
    
    async def search_nodes(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """搜索節點"""
        try:
            query = payload.get('query', '')
            entity_type = payload.get('entity_type')
            center_node_uuid = payload.get('center_node_uuid')
            num_results = payload.get('num_results', 10)
            
            logger.info(f"搜索節點: {query}")
            
            # 使用_search方法進行節點搜索
            search_result = await self.client._search(
                query, 
                NODE_HYBRID_SEARCH_EPISODE_MENTIONS
            )
            
            nodes = []
            if hasattr(search_result, 'nodes') and search_result.nodes:
                for node in search_result.nodes[:num_results]:
                    nodes.append({
                        'uuid': getattr(node, 'uuid', ''),
                        'name': getattr(node, 'name', ''),
                        'type': getattr(node, 'type', ''),
                        'properties': getattr(node, 'properties', {})
                    })
            
            return {
                'success': True,
                'query': query,
                'nodes': nodes,
                'count': len(nodes)
            }
            
        except Exception as e:
            logger.error(f"節點搜索失敗: {e}")
            return {
                'success': False,
                'error': str(e),
                'nodes': []
            }
    
    async def search_facts(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """搜索事實/邊"""
        try:
            query = payload.get('query', '')
            center_node_uuid = payload.get('center_node_uuid')
            num_results = payload.get('num_results', 10)
            
            logger.info(f"搜索事實: {query}")
            
            # 使用search方法獲取邊/事實
            edge_results = await self.client.search(
                query=query,
                center_node_uuid=center_node_uuid,
                num_results=num_results
            )
            
            facts = []
            if hasattr(edge_results, '__iter__'):
                for edge in edge_results:
                    if hasattr(edge, 'fact'):
                        facts.append({
                            'fact': edge.fact,
                            'uuid': getattr(edge, 'uuid', ''),
                            'source_node_uuid': getattr(edge, 'source_node_uuid', ''),
                            'target_node_uuid': getattr(edge, 'target_node_uuid', ''),
                            'weight': getattr(edge, 'weight', None)
                        })
            
            return {
                'success': True,
                'query': query,
                'facts': facts,
                'count': len(facts)
            }
            
        except Exception as e:
            logger.error(f"事實搜索失敗: {e}")
            return {
                'success': False,
                'error': str(e),
                'facts': []
            }
    
    async def build_indices_and_constraints(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """建立索引和約束"""
        try:
            logger.info("建立圖譜索引和約束...")
            await self.client.build_indices_and_constraints()
            
            return {
                'success': True,
                'message': '索引和約束建立成功'
            }
            
        except Exception as e:
            logger.error(f"建立索引和約束失敗: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def clear_data(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """清理圖譜數據"""
        try:
            logger.warning("⚠️ 清理圖譜數據 - 這將刪除所有數據!")
            await clear_data(self.client.driver)
            
            return {
                'success': True,
                'message': '數據清理完成'
            }
            
        except Exception as e:
            logger.error(f"清理數據失敗: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_status(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """獲取服務狀態"""
        try:
            # 簡單的健康檢查
            is_connected = self.client is not None
            
            return {
                'success': True,
                'status': 'running',
                'graphiti_connected': is_connected,
                'neo4j_uri': os.environ.get('NEO4J_URI', 'bolt://localhost:7687'),
                'neo4j_user': os.environ.get('NEO4J_USER', 'neo4j')
            }
            
        except Exception as e:
            logger.error(f"獲取狀態失敗: {e}")
            return {
                'success': False,
                'error': str(e),
                'status': 'error'
            }

async def main():
    """主函數"""
    if len(sys.argv) < 2:
        logger.error("用法: python graphiti_bridge.py <method>")
        sys.exit(1)
    
    method = sys.argv[1]
    
    # 從stdin讀取載荷
    try:
        input_data = sys.stdin.read()
        payload = json.loads(input_data) if input_data.strip() else {}
    except json.JSONDecodeError as e:
        logger.error(f"JSON解析錯誤: {e}")
        result = {'success': False, 'error': f'JSON解析錯誤: {e}'}
        print(json.dumps(result))
        sys.exit(1)
    
    # 初始化橋接服務
    try:
        bridge = GraphitiBridge()
    except Exception as e:
        logger.error(f"初始化失敗: {e}")
        result = {'success': False, 'error': f'初始化失敗: {e}'}
        print(json.dumps(result))
        sys.exit(1)
    
    # 執行方法
    try:
        if hasattr(bridge, method):
            method_func = getattr(bridge, method)
            result = await method_func(payload)
        else:
            result = {
                'success': False,
                'error': f'未知方法: {method}',
                'available_methods': [
                    'add_episode',
                    'search', 
                    'search_nodes',
                    'search_facts',
                    'build_indices_and_constraints',
                    'clear_data',
                    'get_status'
                ]
            }
    except Exception as e:
        logger.error(f"方法執行失敗 [{method}]: {e}")
        result = {'success': False, 'error': f'方法執行失敗: {e}'}
    
    # 輸出結果
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    asyncio.run(main())