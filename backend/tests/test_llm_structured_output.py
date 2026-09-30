"""Regression coverage for Qwen thinking and forced schema output."""
import json
import types
import unittest
from unittest.mock import AsyncMock, Mock, patch

from app.core import llm_factory
from app.agents.critic import CriticOutput
from app.agents.writer import WriterOutput
from app.agents.state_extractor import StateDiff, state_extractor_node


def settings():
    return types.SimpleNamespace(
        alibaba_api_key="qa-key", alibaba_base_url="https://workspace.example/compatible-mode/v1",
        editor_model="alibaba/qwen3.8-flash", openai_api_key="", gemini_api_key="",
        groq_api_key="", huggingface_api_key="",
    )


def provider_response(data):
    async def create(**request):
        # Reproduce Alibaba rejecting a forced tool while thinking is enabled.
        if request.get("extra_body", {}).get("enable_thinking") is not False:
            raise ValueError("The tool_choice parameter does not support being set to required or object in thinking mode")
        name = request["tool_choice"]["function"]["name"]
        return {
            "id": "chatcmpl-qa", "model": request["model"],
            "choices": [{"index": 0, "finish_reason": "tool_calls", "message": {
                "role": "assistant", "content": None, "tool_calls": [{
                    "id": "call-qa", "type": "function",
                    "function": {"name": name, "arguments": json.dumps(data)},
                }],
            }}],
        }
    return AsyncMock(side_effect=create)


class StructuredOutputTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_three_schemas_parse_without_thinking_conflict(self):
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
                create = provider_response(data)
                llm.async_client = types.SimpleNamespace(create=create)
                result = await llm_factory.with_structured_output(llm, schema).ainvoke("Return the requested schema.")
                self.assertEqual(result, schema.model_validate(data))
                create.assert_awaited_once()
                self.assertFalse(create.call_args.kwargs["extra_body"]["parallel_tool_calls"])
                # Director/plain-text clients must not be changed by the helper.
                self.assertTrue(llm.extra_body["enable_thinking"])

    async def test_state_extractor_uses_schema_output_on_first_request(self):
        from app.agents import state_extractor
        config = settings()
        with patch.object(llm_factory, "get_settings", return_value=config):
            llm = llm_factory.get_llm(config.editor_model, temperature=0.1)
        create = provider_response({
            "hp_change": -10, "energy_change": -5,
            "psychology": {"mood": "đau đớn", "current_thoughts": "Cần nghỉ ngơi."},
            "economy": {}, "is_game_over": False,
        })
        llm.async_client = types.SimpleNamespace(create=create)
        state = {"story_config": {"character": {}, "locations": []},
                 "chapter_content": "Nhân vật bị thương mất 10 HP và tiêu hao 5 năng lượng."}
        with patch.object(state_extractor, "get_settings", return_value=config), patch.object(llm_factory, "get_llm", return_value=llm), patch("builtins.print"):
            result = await state_extractor_node(state)
        self.assertEqual(result["state_changes"]["hp_change"], -10)
        self.assertEqual(result["state_changes"]["energy_change"], -5)
        self.assertFalse(result["is_game_over"])
        create.assert_awaited_once()

    async def test_other_models_keep_their_structured_output_policy(self):
        for model in ["gpt-4o-mini", "qwen-max", "qwen3-coder-plus", "hf/Qwen/Qwen3.8"]:
            with self.subTest(model=model):
                client = types.SimpleNamespace(model_name=model, with_structured_output=Mock(return_value="structured"))
                self.assertEqual(llm_factory.with_structured_output(client, CriticOutput), "structured")
                client.with_structured_output.assert_called_once_with(CriticOutput, include_raw=False)


if __name__ == "__main__":
    unittest.main()
