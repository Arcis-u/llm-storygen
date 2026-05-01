"""
Web Search Service using DuckDuckGo.
Provides a free internet search capability for the LLM without requiring an API key.
"""

from duckduckgo_search import DDGS
from langchain_core.tools import tool

@tool
def web_search(query: str) -> str:
    """
    Search the web for real-world factual information.
    Use this ONLY when you need to know about real organizations, prices, historical events, 
    locations, or physics/mechanics that exist in the real world.
    DO NOT use this for fictional lore.
    """
    print(f"[TOOL] Executing Web Search: {query}")
    try:
        with DDGS() as ddgs:
            # Get top 3 results
            results = list(ddgs.text(query, max_results=3))
            
        if not results:
            return f"No results found for query: {query}"
            
        formatted_results = []
        for i, res in enumerate(results):
            formatted_results.append(f"Result {i+1}:\nTitle: {res.get('title')}\nContent: {res.get('body')}")
            
        return "\n\n".join(formatted_results)
    except Exception as e:
        print(f"[TOOL ERROR] Web Search failed: {e}")
        return f"Web search failed: {e}"
