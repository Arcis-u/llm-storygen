"""
LLM Factory Module.
Provides a unified interface to get LangChain LLM instances based on configured models.
Supports: HuggingFace (primary), Google Gemini, Groq, OpenAI, Anthropic.
"""

from app.core.config import get_settings


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
    if "alibaba/" in model_lower or "qwen" in model_lower:
        if not settings.alibaba_api_key:
            raise ValueError(f"ALIBABA_API_KEY is missing for model {model_name}")
        
        # Strip "alibaba/" prefix — DashScope API only accepts bare model names like "qwen3.6-plus"
        actual_model = model_name.replace("alibaba/", "").replace("ALIBABA/", "")
        
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=actual_model,
            api_key=settings.alibaba_api_key,
            base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
            temperature=temperature,
            max_tokens=max_tokens
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
