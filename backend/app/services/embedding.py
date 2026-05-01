"""
Embedding Service.
Provides vector embeddings via:
  1. Alibaba Cloud DashScope (text-embedding-v4) — Primary
  2. HuggingFace Inference API — Fallback
  3. Google Gemini / OpenAI — Legacy fallback

text-embedding-v4 specs:
  - Default dimension: 1024
  - Supported: 2048, 1536, 1024, 768, 512, 256, 128, 64
  - API: OpenAI-compatible via https://dashscope-intl.aliyuncs.com/compatible-mode/v1
"""

from app.core.config import get_settings

# Cache embedding clients
_alibaba_client = None
_hf_embeddings = None


# ─── Alibaba DashScope (text-embedding-v4) ─────────────────────
def _get_alibaba_client():
    """Lazy-load and cache the OpenAI-compatible client for DashScope."""
    global _alibaba_client
    if _alibaba_client is None:
        settings = get_settings()
        from openai import AsyncOpenAI
        _alibaba_client = AsyncOpenAI(
            api_key=settings.alibaba_api_key,
            base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        )
    return _alibaba_client


# ─── HuggingFace (fallback) ─────────────────────────────────────
def _get_hf_embeddings():
    """Lazy-load and cache HuggingFace embeddings model."""
    global _hf_embeddings
    if _hf_embeddings is None:
        settings = get_settings()
        from langchain_huggingface import HuggingFaceEndpointEmbeddings
        _hf_embeddings = HuggingFaceEndpointEmbeddings(
            model=settings.embedding_model,
            huggingfacehub_api_token=settings.huggingface_api_key,
        )
    return _hf_embeddings


# ─── Dimension Lookup ───────────────────────────────────────────
_MODEL_DIMENSIONS = {
    "text-embedding-v4": 1024,
    "text-embedding-v3": 1024,
    "minilm": 384,
    "all-minilm": 384,
    "bge-small": 384,
    "bge-base": 768,
    "bge-large": 1024,
    "e5-small": 384,
    "e5-base": 768,
    "e5-large": 1024,
    "qwen3-embedding-8b": 4096,
    "qwen3-embedding": 2560,
    "gte": 768,
    "gemini": 768,
    "004": 768,
}


def get_embedding_dimension() -> int:
    """Returns the embedding dimension for the configured model."""
    settings = get_settings()
    model = settings.embedding_model.lower()

    for key, dim in _MODEL_DIMENSIONS.items():
        if key in model:
            return dim

    return 1536  # OpenAI default


# ─── Main API ───────────────────────────────────────────────────
async def get_text_embedding(text: str) -> list[float]:
    """
    Generate vector embedding for a given text using configured model.
    Priority: Alibaba text-embedding-v4 > HuggingFace > Gemini > OpenAI
    """
    settings = get_settings()
    model_name = settings.embedding_model.lower()

    try:
        # 1. Alibaba DashScope (text-embedding-v4 / v3)
        if "text-embedding-v" in model_name:
            client = _get_alibaba_client()
            response = await client.embeddings.create(
                model=settings.embedding_model,  # "text-embedding-v4"
                input=text,
                dimensions=1024,  # Explicit dimension for consistency
            )
            return response.data[0].embedding

        # 2. HuggingFace models (sentence-transformers, Qwen, BGE, etc.)
        elif any(k in model_name for k in ["sentence-transformers", "minilm", "bge", "e5", "qwen", "gte"]):
            import asyncio
            embeddings = _get_hf_embeddings()
            result = await asyncio.to_thread(embeddings.embed_query, text)
            return result

        # 3. Google Gemini
        elif "gemini" in model_name or "004" in model_name:
            if not settings.gemini_api_key:
                print("[WARNING] No Gemini API key provided. Using dummy zero vector.")
                return [0.0] * 768

            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            model_str = settings.embedding_model if "models/" in settings.embedding_model else f"models/{settings.embedding_model}"
            embeddings = GoogleGenerativeAIEmbeddings(
                model=model_str,
                google_api_key=settings.gemini_api_key
            )
            return await embeddings.aembed_query(text)

        # 4. OpenAI (fallback)
        else:
            if not settings.openai_api_key:
                print("[WARNING] No OpenAI API key provided. Using dummy zero vector.")
                return [0.0] * 1536

            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            response = await client.embeddings.create(
                model=settings.embedding_model,
                input=text
            )
            return response.data[0].embedding

    except Exception as e:
        print(f"[ERROR] Embedding generation failed: {e}")
        dim = get_embedding_dimension()
        return [0.0] * dim
