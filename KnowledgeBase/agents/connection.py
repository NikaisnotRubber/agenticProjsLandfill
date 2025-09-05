import datetime
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from graphiti_core import Graphiti
from graphiti_core.edges import EntityEdge
from graphiti_core.nodes import EpisodeType
from graphiti_core.search.search_config_recipes import \
    NODE_HYBRID_SEARCH_EPISODE_MENTIONS
from graphiti_core.utils.maintenance import clear_data
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import ToolNode

import langextract as lx
from ..extractor.extractor import result

client = Graphiti("bolt://localhost:7687", "neo4j", "test1234")
user_name = os.environ.get("USER_NAME")


async def index_langextract_episodes(langextract_result: lx.ExtractionResult):
    await clear_data(client.driver)
    await client.build_indices_and_constraints()

    for i, extraction in enumerate(langextract_result.extractions):
        episode_body = {
            "extraction_class": extraction.extraction_class,
            "extraction_text": extraction.extraction_text,
            "attributes": extraction.attributes if hasattr(extraction, 'attributes') else {}
        }
        
        await client.add_episode(
            name=f"{extraction.extraction_class}: {extraction.extraction_text[:50]}...",
            episode_body=str(episode_body),
            source_description="Code Knowledge Extraction",
            source=EpisodeType.text,
            reference_time=datetime.now(timezone.utc),
        )


async def create_user_node():
    await client.add_episode(
        name="User Creation Node",
        episode_body=f"{user_name} is interested in buying pair of shoes.",
        source=EpisodeType.text,
        source_description="SalesBot",
        reference_time=datetime.now(timezone.utc),
    )


async def get_user_node_uuid():
    nl = await client._search(user_name, NODE_HYBRID_SEARCH_EPISODE_MENTIONS)
    user_node_uuid = nl.nodes[0].uuid
    return user_node_uuid


async def get_code_knowledge_node_uuid():
    nl = await client._search("Code Knowledge Extraction", NODE_HYBRID_SEARCH_EPISODE_MENTIONS)
    knowledge_node_uuid = nl.nodes[0].uuid
    return knowledge_node_uuid


def edges_to_facts_string(entities: list[EntityEdge]):
    return "-" + "\n- ".join([edge.fact for edge in entities])


@tool
async def get_code_knowledge(query: str) -> str:
    """Search the graphiti graph for code knowledge and programming information"""
    knowledge_node_uuid = await get_code_knowledge_node_uuid()
    edge_result = await client.search(
        query, center_node_uuid=knowledge_node_uuid, num_results=10
    )
    return edges_to_facts_string(edge_result)


tools = [get_code_knowledge]
tool_node = ToolNode(tools)

llm = ChatOpenAI(model= os.environ.get('OPENAI_MODEL','delta-agentic-coding'), temperature=0).bind_tools(tools)


async def execute(langextract_result: lx.ExtractionResult = None):
    if os.environ.get("ENABLE_INDEXING", "false").lower() == "true" and langextract_result:
        await index_langextract_episodes(langextract_result)

    if os.environ.get("ENABLE_USER_NODE", "false").lower() == "true":
        await create_user_node()

    result = await tool_node.ainvoke({"messages": [await llm.ainvoke("Python functions")]})
    print("result:\n ", result["messages"][0].content)
