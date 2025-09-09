import asyncio
import datetime
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from extractor import Extractor

from graphiti_core import Graphiti
from graphiti_core.edges import EntityEdge
from graphiti_core.nodes import EpisodeType
from graphiti_core.search.search_config_recipes import \
    NODE_HYBRID_SEARCH_EPISODE_MENTIONS, NODE_HYBRID_SEARCH_RRF
from graphiti_core.utils.maintenance import clear_data

from graphiti_core.llm_client.gemini_client import GeminiClient, LLMConfig
from graphiti_core.embedder.gemini import GeminiEmbedder, GeminiEmbedderConfig
from graphiti_core.cross_encoder.gemini_reranker_client import GeminiRerankerClient

from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import ToolNode

import langextract as lx

neo4j_uri = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')
neo4j_user = os.environ.get('NEO4J_USER', 'neo4j') 
neo4j_password = os.environ.get('NEO4J_PASSWORD', 'test1234')

# Initialize Graphiti with proper configuration and LLM settings
try:
    # Ensure OpenAI environment variables are set for Graphiti

    api_key = os.environ.get('GEMINI_API_KEY')
    graphiti = Graphiti(
        neo4j_uri, 
        neo4j_user, 
        neo4j_password,
        llm_client=GeminiClient(
            config=LLMConfig(
                api_key=api_key,
                model="gemini-2.5-flash"
            )
        ),
        embedder=GeminiEmbedder(
            config=GeminiEmbedderConfig(
                api_key=api_key,
                embedding_model="gemini-embedding-001"
            )
        ),
        cross_encoder=GeminiRerankerClient(
            config=LLMConfig(
                api_key=api_key,
                model="gemini-2.5-flash"
            )
        )
    )
        # You can optionally specify LLM model here if needed
    
except Exception as e:
    print(f"Error initializing Graphiti: {e}")
    raise

langextract_results = Extractor.langExtractor()

async def main():
    try:
        # await clear_data(graphiti.driver)
        await graphiti.build_indices_and_constraints()

        for res in langextract_results:
            # for i, data in enumerate(res["metadata"]):
                # Create a proper episode body with extracted code knowledge
            episode_body = {
                "file_id": f"{res['id']}",
                "code_with_comment": res["metadata"].get("code_with_comment", "")
                if res["metadata"].get("code_with_comment", "") else "unknown",
                "import_statement": res["metadata"].get("import_statement", "unknown"),
                "jira_field": res["metadata"].get("jira_field", "unknown"), 
                "function_name": res["metadata"].get("function_name", "unknown")
            }
            
            await graphiti.add_episode(
                name=f"{res['id']}",
                episode_body=json.dumps(res["metadata"], ensure_ascii=False),
                source_description="Code Knowledge Extraction",
                source=EpisodeType.text,
                reference_time=datetime.now(timezone.utc),
            )

        #################################################
        # BASIC SEARCH
        #################################################
        # The simplest way to retrieve relationships (edges)
        # from Graphiti is using the search method, which
        # performs a hybrid search combining semantic
        # similarity and BM25 text retrieval.
        #################################################

        # Perform a hybrid search combining semantic similarity and BM25 retrieval
        results = await graphiti.search('Who was the California Attorney General?')

        # Print search results
        print('\nSearch Results:')
        for result in results:
            print(f'UUID: {result.uuid}')
            print(f'Fact: {result.fact}')
            if hasattr(result, 'valid_at') and result.valid_at:
                print(f'Valid from: {result.valid_at}')
            if hasattr(result, 'invalid_at') and result.invalid_at:
                print(f'Valid until: {result.invalid_at}')
            print('---')

        #################################################
        # CENTER NODE SEARCH
        #################################################
        # For more contextually relevant results, you can
        # use a center node to rerank search results based
        # on their graph distance to a specific node
        #################################################

        # Use the top search result's UUID as the center node for reranking
        if results and len(results) > 0:
            # Get the source node UUID from the top result
            center_node_uuid = results[0].source_node_uuid

            print('\nReranking search results based on graph distance:')
            print(f'Using center node UUID: {center_node_uuid}')

            reranked_results = await graphiti.search(
                'Who was the California Attorney General?', center_node_uuid=center_node_uuid
            )

            # Print reranked search results
            print('\nReranked Search Results:')
            for result in reranked_results:
                print(f'UUID: {result.uuid}')
                print(f'Fact: {result.fact}')
                if hasattr(result, 'valid_at') and result.valid_at:
                    print(f'Valid from: {result.valid_at}')
                if hasattr(result, 'invalid_at') and result.invalid_at:
                    print(f'Valid until: {result.invalid_at}')
                print('---')
        else:
            print('No results found in the initial search to use as center node.')

        #################################################
        # NODE SEARCH USING SEARCH RECIPES
        #################################################
        # Graphiti provides predefined search recipes
        # optimized for different search scenarios.
        # Here we use NODE_HYBRID_SEARCH_RRF for retrieving
        # nodes directly instead of edges.
        #################################################

        # Example: Perform a node search using _search method with standard recipes
        print(
            '\nPerforming node search using _search method with standard recipe NODE_HYBRID_SEARCH_RRF:'
        )

        # Use a predefined search configuration recipe and modify its limit
        node_search_config = NODE_HYBRID_SEARCH_RRF.model_copy(deep=True)
        node_search_config.limit = 3

        # Execute the node search
        node_search_results = await graphiti._search(
            query='call the manager for customField',
            config=node_search_config,
        )

        # Print node search results
        print('\nNode Search Results:')
        for node in node_search_results.nodes:
            print(f'Node UUID: {node.uuid}')
            print(f'Node Name: {node.name}')
            node_summary = node.summary[:100] + '...' if len(node.summary) > 100 else node.summary
            print(f'Content Summary: {node_summary}')
            print(f'Node Labels: {", ".join(node.labels)}')
            print(f'Created At: {node.created_at}')
            if hasattr(node, 'attributes') and node.attributes:
                print('Attributes:')
                for key, value in node.attributes.items():
                    print(f'  {key}: {value}')
            print('---')

    finally:
        #################################################
        # CLEANUP
        #################################################
        # Always close the connection to Neo4j when
        # finished to properly release resources
        #################################################

        # Close the connection
        await graphiti.close()
        print('\nConnection closed')


if __name__ == '__main__':
    asyncio.run(main())