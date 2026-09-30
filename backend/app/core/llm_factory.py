"""
LLM Factory Module.
Provides a unified interface to get LangChain LLM instances based on configured models.
Supports: HuggingFace (primary), Google Gemini, Groq, OpenAI, Anthropic.
"""

from app.core.config import get_settings


def _is_qwen_hybrid(model_name: str) -> bool:
    parts = model_name.lower().split("-")
    return (len(parts) >= 2
            and parts[0] in {"qwen3.5", "qwen3.6", "qwen3.7", "qwen3.8"}
            and parts[1] in {"max", "plus", "flash"})


def with_structured_output(llm, schema, *, include_raw: bool = False):
    """Keep Qwen thinking enabled and request JSON rather than force a tool.

    Qwen 3.7/3.8 support native JSON Schema with thinking. Older hybrid models
    use JSON mode with an explicit schema in the prompt and local validation.
    """
    model_name = getattr(llm, "model_name", "") or ""
    options = {"include_raw": include_raw}
    if _is_qwen_hybrid(model_name):
        llm = llm.model_copy(update={
            "extra_body": {**(llm.extra_body or {}), "enable_thinking": True},
        })
        if model_name.lower().startswith(("qwen3.7-", "qwen3.8-")):
            options["method"] = "json_schema"
        else:
            import json
            from langchain_core.messages import HumanMessage, SystemMessage
            from langchain_core.runnables import RunnableLambda

            instruction = "Return ONLY JSON matching this schema:\n" + json.dumps(schema.model_json_schema())

            def schema_messages(value):
                messages = ([HumanMessage(content=value)] if isinstance(value, str)
                            else value.to_messages() if hasattr(value, "to_messages") else list(value))
                return [SystemMessage(content=instruction), *messages]

            return RunnableLambda(schema_messages) | llm.with_structured_output(
                schema, method="json_mode", **options,
            )
    return llm.with_structured_output(schema, **options)


def get_llm(model_name: str, temperature: float = 0.7, max_tokens: int = None):
    """
    Returns the appropriate LangChain Chat model instance based on the model_name prefix.
    Priority: Alibaba > HuggingFace > Gemini > Groq
    """
    settings = get_settings()
    model_lower = model_name.lower()

    # 1. Alibaba Cloud (DashScope OpenAI-compatible mode)
    # Docs: https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions
    # base_url: https://dashscope-intl.aliyuncs.com/compatible-mode/v1 (Singapore region)
    # Model names: qwen3.6-plus, qwen-plus, qwen-max, etc.
    if model_lower.startswith("alibaba/") or ("qwen" in model_lower and not model_lower.startswith("hf/")):
        if not settings.alibaba_api_key:
            raise ValueError(f"ALIBABA_API_KEY is missing for model {model_name}")
        
        # Strip "alibaba/" prefix — DashScope API only accepts bare model names like "qwen3.6-plus"
        actual_model = model_name.replace("alibaba/", "").replace("ALIBABA/", "")
        thinking_options = {"extra_body": {"enable_thinking": True}} if _is_qwen_hybrid(actual_model) else {}
        
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=actual_model,
            api_key=settings.alibaba_api_key,
            base_url=settings.alibaba_base_url,
            temperature=temperature,
            max_tokens=max_tokens,
            **thinking_options,
        )

    # 2. HuggingFace Inference API (for open-source models)
    elif "hf/" in model_lower or "huggingface" in model_lower or "mistral" in model_lower or "deepseek" in model_lower:
        if not settings.huggingface_api_key:
            raise ValueError(f"HUGGINGFACE_API_KEY is missing for model {model_name}")
        
        # Strip "hf/" prefix if present
        repo_id = model_name.replace("hf/", "").replace("HF/", "")
        
        from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
        llm = HuggingFaceEndpoint(
            repo_id=repo_id,
            task="conversational",
            max_new_tokens=max_tokens or 4096,
            temperature=max(temperature, 0.01),  # HF doesn't accept 0
            huggingfacehub_api_token=settings.huggingface_api_key,
            timeout=300, # 5 minutes timeout for heavy models
        )
        return ChatHuggingFace(llm=llm)

    # 3. Google Gemini
    elif "gemini" in model_lower:
        if not settings.gemini_api_key:
            raise ValueError(f"GEMINI_API_KEY is missing for model {model_name}")
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            google_api_key=settings.gemini_api_key,
            max_tokens=max_tokens
        )

    # 4. Groq (Open Source like Llama 3, Mixtral)
    elif "llama" in model_lower or "groq" in model_lower or "gemma" in model_lower:
        if not settings.groq_api_key:
            raise ValueError(f"GROQ_API_KEY is missing for model {model_name}")
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=model_name,
            temperature=temperature,
            api_key=settings.groq_api_key,
            max_tokens=max_tokens
        )


    # 5. OpenAI (Fallback / Default for GPT models)
    else:
        if not settings.openai_api_key:
            raise ValueError(f"OPENAI_API_KEY is missing for model {model_name}")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=settings.openai_api_key,
            max_tokens=max_tokens
        )
