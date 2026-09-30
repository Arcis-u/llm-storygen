"""Regression coverage for thinking-enabled Qwen JSON schema requests."""
import json
import types
import unittest
from unittest.mock import Mock, patch

import httpx
from openai import AsyncOpenAI

from app.core import llm_factory
from app.agents.critic import CriticOutput, critic_node
from app.agents.writer import WriterOutput, writer_node
from app.agents.state_extractor import StateDiff, state_extractor_node


def settings():
    return types.SimpleNamespace(
        alibaba_api_key="qa-key", alibaba_base_url="https://workspace.example/compatible-mode/v1",
        editor_model="alibaba/qwen3.8-flash", openai_api_key="", gemini_api_key="",
        director_model="alibaba/qwen3.8-max", writer_model="alibaba/qwen3.8-max",
        groq_api_key="", huggingface_api_key="",
    )


def provider_client(data):
    requests = []

    def respond(http_request):
        request = json.loads(http_request.content)
        requests.append(request)
        # Exercise the real SDK serialization and parsing without a network.
        if request.get("enable_thinking") is not True or "tool_choice" in request:
            raise ValueError("Thinking must stay enabled without forced tool_choice")
        return httpx.Response(200, json={
            "id": "chatcmpl-qa", "object": "chat.completion", "created": 0, "model": request["model"],
            "choices": [{"index": 0, "finish_reason": "stop", "message": {
                "role": "assistant", "content": json.dumps(data), "reasoning_content": "private-reasoning",
            }}],
        })

    client = AsyncOpenAI(api_key="qa-key", base_url="https://workspace.example/compatible-mode/v1",
                        http_client=httpx.AsyncClient(transport=httpx.MockTransport(respond)))
    return client, requests


class StructuredOutputTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_three_schemas_keep_thinking_and_parse_without_forced_tools(self):
        cases = [
            ("alibaba/qwen3.8-flash", StateDiff, {
                "hp_change": -10, "psychology": {"mood": "lo lắng", "current_thoughts": "Tìm đường thoát."},
                "economy": {}, "is_game_over": False,
            }),
            ("alibaba/qwen3.8-max", WriterOutput, {
                "chapter_title": "Mưa đêm", "chapter_content": "Mưa rơi trên mái nhà.",
                "chapter_summary": "Nhân vật trú mưa.", "tone": "ambient",
            }),
            ("alibaba/qwen3.8-max", CriticOutput, {"passed": True, "feedback": ""}),
        ]
        for model, schema, data in cases:
            with self.subTest(schema=schema.__name__), patch.object(llm_factory, "get_settings", return_value=settings()):
                llm = llm_factory.get_llm(model)
                llm.extra_body = {"enable_thinking": True, "parallel_tool_calls": False}
                client, requests = provider_client(data)
                self.addAsyncCleanup(client.close)
                llm.root_async_client = client
                result = await llm_factory.with_structured_output(llm, schema).ainvoke("Return the requested schema.")
                self.assertEqual(result, schema.model_validate(data))
                self.assertEqual(len(requests), 1)
                self.assertEqual(requests[0]["response_format"]["type"], "json_schema")
                self.assertNotIn("tools", requests[0])
                self.assertFalse(requests[0]["parallel_tool_calls"])
                self.assertTrue(llm.extra_body["enable_thinking"])
                self.assertNotIn("private-reasoning", result.model_dump_json())

    async def test_state_extractor_uses_schema_output_on_first_request(self):
        from app.agents import state_extractor
        config = settings()
        with patch.object(llm_factory, "get_settings", return_value=config):
            llm = llm_factory.get_llm(config.editor_model, temperature=0.1)
        client, requests = provider_client({
            "hp_change": -10, "energy_change": -5,
            "psychology": {"mood": "đau đớn", "current_thoughts": "Cần nghỉ ngơi."},
            "economy": {}, "is_game_over": False,
        })
        self.addAsyncCleanup(client.close)
        llm.root_async_client = client
        state = {"story_config": {"character": {}, "locations": []},
                 "chapter_content": "Nhân vật bị thương mất 10 HP và tiêu hao 5 năng lượng."}
        with patch.object(state_extractor, "get_settings", return_value=config), patch.object(llm_factory, "get_llm", return_value=llm), patch("builtins.print"):
            result = await state_extractor_node(state)
        self.assertEqual(result["state_changes"]["hp_change"], -10)
        self.assertEqual(result["state_changes"]["energy_change"], -5)
        self.assertFalse(result["is_game_over"])
        self.assertEqual(len(requests), 1)

    async def test_writer_and_critic_keep_thinking_on_normal_node_calls(self):
        from app.agents import writer, critic
        config = settings()
        cases = [
            (writer, writer_node, WriterOutput, config.writer_model,
             {"chapter_title": "Mưa đêm", "chapter_content": "Bạn nép dưới mái hiên.",
              "chapter_summary": "Nhân vật trú mưa.", "tone": "ambient"}),
            (critic, critic_node, CriticOutput, config.director_model,
             {"passed": False, "feedback": "Bỏ thông báo hệ thống khỏi truyện."}),
        ]
        for module, node, schema, model, data in cases:
            with self.subTest(schema=schema.__name__), patch.object(llm_factory, "get_settings", return_value=config):
                llm = llm_factory.get_llm(model)
                client, requests = provider_client(data)
                self.addAsyncCleanup(client.close)
                llm.root_async_client = client
                state = {"story_config": {}, "chapter_content": "HP: 50/100", "revision_count": 0}
                with patch.object(module, "get_settings", return_value=config), patch.object(llm_factory, "get_llm", return_value=llm), patch("builtins.print"):
                    result = await node(state)
                self.assertEqual(len(requests), 1)
                if schema is WriterOutput:
                    self.assertEqual(result["chapter_content"], data["chapter_content"])
                else:
                    self.assertFalse(result["critic_passed"])
                    self.assertEqual(result["critic_feedback"], data["feedback"])
                    self.assertEqual(result["revision_count"], 1)

    async def test_factory_explicitly_enables_thinking_for_all_qwen_roles(self):
        with patch.object(llm_factory, "get_settings", return_value=settings()), patch("langchain_openai.ChatOpenAI") as chat:
            for model in ["alibaba/qwen3.8-max", "alibaba/qwen3.8-flash", "alibaba/qwen3.7-plus"]:
                llm_factory.get_llm(model)
                self.assertIs(chat.call_args.kwargs["extra_body"]["enable_thinking"], True)

    async def test_older_hybrid_uses_json_mode_with_schema_and_thinking(self):
        with patch.object(llm_factory, "get_settings", return_value=settings()):
            llm = llm_factory.get_llm("alibaba/qwen3.6-flash")
        client, requests = provider_client({"passed": False, "feedback": "Bỏ thông số game."})
        self.addAsyncCleanup(client.close)
        llm.async_client = client.chat.completions
        llm.root_async_client = client
        result = await llm_factory.with_structured_output(llm, CriticOutput).ainvoke("Evaluate the scene.")
        self.assertFalse(result.passed)
        self.assertEqual(requests[0]["response_format"]["type"], "json_object")
        self.assertIn("CriticOutput", requests[0]["messages"][0]["content"])

    async def test_event_stream_parses_schema_without_exposing_reasoning(self):
        with patch.object(llm_factory, "get_settings", return_value=settings()):
            llm = llm_factory.get_llm("alibaba/qwen3.8-max")
        client, requests = provider_client({"passed": False, "feedback": "Bỏ thông số game."})
        self.addAsyncCleanup(client.close)
        llm.root_async_client = client
        events = [event async for event in llm_factory.with_structured_output(llm, CriticOutput).astream_events(
            "Evaluate the scene.", version="v2",
        )]
        outputs = [event.get("data", {}).get("output") for event in events]
        self.assertTrue(any(isinstance(output, CriticOutput) and not output.passed for output in outputs))
        self.assertNotIn("private-reasoning", json.dumps(events, default=str))
        self.assertEqual(len(requests), 1)

    async def test_other_models_keep_their_structured_output_policy(self):
        for model in ["gpt-4o-mini", "qwen-max", "qwen3-coder-plus", "hf/Qwen/Qwen3.8"]:
            with self.subTest(model=model):
                client = types.SimpleNamespace(model_name=model, with_structured_output=Mock(return_value="structured"))
                self.assertEqual(llm_factory.with_structured_output(client, CriticOutput), "structured")
                client.with_structured_output.assert_called_once_with(CriticOutput, include_raw=False)


if __name__ == "__main__":
    unittest.main()
