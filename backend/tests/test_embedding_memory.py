"""Offline coverage for provider routing, vectors, complete chapter memory and retries."""
import types
import unittest
from unittest.mock import AsyncMock, patch

from app.services import embedding
from app.services.story_memory import chapter_memories, split_passages, select_memories
from app.core import database
from app.core import llm_factory
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams


def profile(**overrides):
    values = dict(embedding_model="qwen3.7-text-embedding", embedding_dimensions=2048,
                  alibaba_api_key="qa-key", alibaba_base_url="https://workspace.example/compatible-mode/v1",
                  qdrant_collection_name="test-memory", huggingface_api_key="", gemini_api_key="", openai_api_key="")
    return types.SimpleNamespace(**(values | overrides))


class EmbeddingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.settings = profile()
        self.settings_patch = patch.object(embedding, "get_settings", return_value=self.settings)
        self.settings_patch.start()
        self.addCleanup(self.settings_patch.stop)
        self.api = AsyncMock()
        self.client_patch = patch.object(embedding, "_get_alibaba_client", return_value=types.SimpleNamespace(embeddings=self.api))
        self.client_patch.start()
        self.addCleanup(self.client_patch.stop)

    async def test_qwen37_routes_to_alibaba_with_explicit_2048_and_preserves_order(self):
        self.api.create.return_value = types.SimpleNamespace(data=[
            types.SimpleNamespace(index=1, embedding=[2.0] * 2048),
            types.SimpleNamespace(index=0, embedding=[1.0] * 2048)])
        vectors = await embedding.get_text_embeddings(["opening", "ending"])
        self.assertEqual([vector[0] for vector in vectors], [1.0, 2.0])
        self.api.create.assert_awaited_once_with(model="qwen3.7-text-embedding", input=["opening", "ending"],
                                               dimensions=2048, encoding_format="float")

    async def test_batch_limit_and_provider_prefix(self):
        self.settings.embedding_model = "alibaba/qwen3.7-text-embedding"
        async def response(**kwargs):
            return types.SimpleNamespace(data=[types.SimpleNamespace(index=index, embedding=[1.0] * 2048)
                                               for index in range(len(kwargs["input"]))])
        self.api.create.side_effect = response
        vectors = await embedding.get_text_embeddings([f"passage {index}" for index in range(21)])
        self.assertEqual(len(vectors), 21)
        self.assertEqual([len(call.kwargs["input"]) for call in self.api.create.await_args_list], [20, 1])

    async def test_provider_failure_is_not_a_zero_vector(self):
        self.api.create.side_effect = RuntimeError("provider unavailable")
        with self.assertRaisesRegex(RuntimeError, "provider unavailable"):
            await embedding.get_text_embedding("text")

    async def test_malformed_embeddings_are_rejected(self):
        for vector in [[1.0] * 1024, [0.0] * 2048, [float("nan")] * 2048, [float("inf")] * 2048]:
            self.api.create.return_value = types.SimpleNamespace(data=[types.SimpleNamespace(index=0, embedding=vector)])
            with self.assertRaises(ValueError):
                await embedding.get_text_embedding("text")
        self.api.create.return_value = types.SimpleNamespace(data=[types.SimpleNamespace(index=1, embedding=[1.0] * 2048)])
        with self.assertRaises(ValueError):
            await embedding.get_text_embedding("text")

    async def test_invalid_dimension_fails_before_request(self):
        self.settings.embedding_dimensions = 2000
        with self.assertRaises(ValueError):
            await embedding.get_text_embedding("text")
        self.api.create.assert_not_awaited()

    async def test_empty_inputs_do_not_call_provider(self):
        self.assertEqual(await embedding.get_text_embeddings([]), [])
        with self.assertRaises(ValueError):
            await embedding.get_text_embedding(" ")
        self.api.create.assert_not_awaited()


class MemoryTests(unittest.TestCase):
    def test_summary_and_end_of_long_chapter_are_retained(self):
        text = "\n\n".join(f"Scene {i}: " + "mưa neon " * 100 for i in range(10)) + "\n\nEcho promised to return the silver key."
        chapter = types.SimpleNamespace(content=text, summary="Kira crossed the city.")
        entries = chapter_memories(chapter)
        self.assertEqual(entries[0]["kind"], "summary")
        self.assertEqual(entries[0]["text"], chapter.summary)
        self.assertIn("return the silver key", entries[-1]["text"])
        for i in range(10):
            self.assertTrue(any(f"Scene {i}:" in entry["text"] for entry in entries))
        self.assertTrue(all(len(entry["text"]) <= 1800 for entry in entries[1:]))

    def test_short_empty_and_unbroken_text(self):
        self.assertEqual(split_passages(""), [])
        self.assertEqual(split_passages("single passage"), ["single passage"])
        self.assertEqual(split_passages("x" * 5000)[-1][-1], "x")

    def test_selection_is_bounded_diverse_and_chronological(self):
        hits = [types.SimpleNamespace(score=.8, payload={"chapter_number": n, "text": f"detail {n}-{i}", "chunk_index": i})
                for n in [3, 1, 2] for i in range(4)]
        selected = select_memories(hits)
        self.assertEqual(len(selected), 6)
        self.assertTrue(selected[0].startswith("[Ch.1]"))
        self.assertTrue(selected[-1].startswith("[Ch.3]"))
        self.assertLessEqual(sum(map(len, select_memories(hits, max_characters=30))), 30)


class MemoryPersistenceTests(unittest.IsolatedAsyncioTestCase):
    async def test_reindex_is_idempotent_and_points_keep_profile_and_full_passages(self):
        settings = profile()
        client = QdrantClient(":memory:")
        client.create_collection(settings.qdrant_collection_name, vectors_config=VectorParams(size=2048, distance=Distance.COSINE))
        chapter = types.SimpleNamespace(story_id="story", chapter_number=4, content="opening " * 600 + " FINAL SECRET", summary="summary")
        entries = chapter_memories(chapter)
        vectors = [[1.0] * 2048 for _ in entries]
        try:
            with patch.object(database, "get_qdrant", return_value=client), patch.object(database, "get_settings", return_value=settings), patch.object(embedding, "get_settings", return_value=settings):
                await database.save_chapter_memories(chapter, entries, vectors)
                await database.save_chapter_memories(chapter, entries, vectors)
            self.assertEqual(client.count(settings.qdrant_collection_name, exact=True).count, len(entries))
            points, _ = client.scroll(settings.qdrant_collection_name, limit=100)
            self.assertTrue(any("FINAL SECRET" in point.payload["text"] for point in points))
            self.assertTrue(all(point.payload["embedding_dimensions"] == 2048 for point in points))
        finally:
            client.close()


class IntegrationBoundaryTests(unittest.IsolatedAsyncioTestCase):
    async def test_llm_and_embedding_clients_use_the_configured_workspace(self):
        settings = profile()
        with patch.object(llm_factory, "get_settings", return_value=settings), patch("langchain_openai.ChatOpenAI") as chat:
            llm_factory.get_llm("alibaba/qwen3.8-flash")
            self.assertEqual(chat.call_args.kwargs["base_url"], settings.alibaba_base_url)
            self.assertEqual(chat.call_args.kwargs["model"], "qwen3.8-flash")
        with patch.object(embedding, "get_settings", return_value=settings), patch.object(embedding, "_alibaba_client", None), patch("openai.AsyncOpenAI") as client:
            embedding._get_alibaba_client()
            self.assertEqual(client.call_args.kwargs["base_url"], settings.alibaba_base_url)

    async def test_memory_reads_are_story_scoped_and_keep_recent_context_on_failure(self):
        from app.agents import memory
        state = {"relevant_memories": ["recent"], "player_action": {"story_id": "owner-story"}, "action_context": "Find Echo"}
        qdrant = types.SimpleNamespace(search=lambda **kwargs: [])
        with patch.object(memory, "get_text_embedding", AsyncMock(return_value=[1.0] * 2048)), patch.object(memory, "get_qdrant", return_value=qdrant), patch.object(qdrant, "search", return_value=[]) as search:
            await memory.memory_retrieval_node(state)
            self.assertEqual(search.call_args.kwargs["query_filter"]["must"][0]["match"]["value"], "owner-story")
            self.assertEqual(state["relevant_memories"], ["recent"])
        with patch.object(memory, "get_text_embedding", AsyncMock(side_effect=RuntimeError("unavailable"))):
            with self.assertLogs(memory.logger, level="WARNING"):
                await memory.memory_retrieval_node(state)
            self.assertEqual(state["relevant_memories"], ["recent"])

    async def test_background_index_batches_full_chapter_and_skips_failed_embeddings(self):
        from app.core import turn_service
        chapter = types.SimpleNamespace(story_id="story", chapter_number=3, summary="short summary",
                                        content="opening " * 600 + " FINAL PROMISE")
        embed = AsyncMock(return_value=[[1.0] * 2048])
        with patch.object(embedding, "get_text_embeddings", embed), patch.object(turn_service, "save_chapter_memories", AsyncMock()) as save:
            await turn_service.index_chapter(chapter)
            self.assertIn("FINAL PROMISE", embed.call_args.args[0][-1])
            save.assert_awaited_once()
        with patch.object(embedding, "get_text_embeddings", AsyncMock(side_effect=RuntimeError("offline"))), patch.object(turn_service, "save_chapter_memories", AsyncMock()) as save:
            with self.assertLogs(turn_service.logger, level="WARNING"):
                await turn_service.index_chapter(chapter)
            save.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
