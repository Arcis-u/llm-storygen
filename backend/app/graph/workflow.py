"""
LangGraph Workflow Assembly (v2).
Connects the Multi-Agent nodes into a single cohesive pipeline.
Includes conditional edge: if is_game_over, skip GameMaster.
"""

from langgraph.graph import StateGraph, END

from app.graph.state import GraphState
from app.agents.memory import memory_retrieval_node
from app.agents.director import director_node
from app.agents.writer import writer_node
from app.agents.state_extractor import state_extractor_node
from app.agents.gamemaster import gamemaster_node


def should_generate_choices(state: GraphState) -> str:
    """Conditional edge: skip GameMaster if the character is dead."""
    if state.get("is_game_over", False):
        print("[WORKFLOW] Game Over detected — skipping GameMaster.")
        return "end"
    return "gamemaster"


def build_story_workflow():
    """Builds and compiles the story generation pipeline."""
    workflow = StateGraph(GraphState)

    # Add nodes
    workflow.add_node("memory_retrieval", memory_retrieval_node)
    workflow.add_node("director", director_node)
    workflow.add_node("writer", writer_node)
    workflow.add_node("state_extractor", state_extractor_node)
    workflow.add_node("gamemaster", gamemaster_node)

    # Linear edges: Memory → Director → Writer → StateExtractor
    workflow.set_entry_point("memory_retrieval")
    workflow.add_edge("memory_retrieval", "director")
    workflow.add_edge("director", "writer")
    workflow.add_edge("writer", "state_extractor")

    # Conditional edge: StateExtractor → GameMaster OR END
    workflow.add_conditional_edges(
        "state_extractor",
        should_generate_choices,
        {
            "gamemaster": "gamemaster",
            "end": END,
        }
    )
    workflow.add_edge("gamemaster", END)

    # Compile the graph
    app = workflow.compile()
    return app


# Singleton instance of the compiled workflow
story_pipeline = build_story_workflow()
