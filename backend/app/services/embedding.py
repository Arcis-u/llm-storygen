"""Validated embeddings. Provider failures never become fabricated zero vectors."""
import asyncio
import math

from app.core.config import get_settings

_alibaba_client = None
_hf_embeddings = None

_ALIBABA_DIMENSIONS = {
    "qwen3.7-text-embedding": {256, 512, 768, 1024, 1536, 2048, 2560},
    "text-embedding-v4": {64, 128, 256, 512, 768, 1024, 1536, 2048},
    "text-embedding-v3": {512, 768, 1024},
}
_MODEL_DIMENSIONS = {
    "text-embedding-3-large": 3072,
    "text-embedding-3-small": 1536,
    "text-embedding-ada-002": 1536,
    "qwen3-embedding-8b": 4096,
    "qwen3-embedding-4b": 2560,
    "qwen3-embedding-0.6b": 1024,
    "minilm": 384,
    "bge-small": 384,
    "bge-base": 768,
    "bge-large": 1024,
    "e5-small": 384,
    "e5-base": 768,
    "e5-large": 1024,
    "gte": 768,
    "gemini": 768,
    "004": 768,
}


def _model_name() -> str:
    name = get_settings().embedding_model
    return name.split("/", 1)[1] if name.lower().startswith("alibaba/") else name


def get_embedding_dimension() -> int:
    settings = get_settings()
    model = _model_name().lower()
    explicit = settings.embedding_dimensions
    if model in _ALIBABA_DIMENSIONS:
        dimension = explicit or 1024
        if dimension not in _ALIBABA_DIMENSIONS[model]:
            raise ValueError(f"Unsupported EMBEDDING_DIMENSIONS={dimension} for {model}")
        return dimension
    for key, native in _MODEL_DIMENSIONS.items():
        if key in model:
            if model.startswith("text-embedding-3-"):
                if explicit and explicit > native:
                    raise ValueError(f"EMBEDDING_DIMENSIONS exceeds {native} for {model}")
                return explicit or native
            if explicit and explicit != native:
                raise ValueError(f"{model} requires its native embedding dimension {native}")
            return native
    if explicit:
        return explicit
    raise ValueError(f"Unknown dimension for {model}; configure EMBEDDING_DIMENSIONS explicitly")


def _get_alibaba_client():
    global _alibaba_client
    settings = get_settings()
    if not settings.alibaba_api_key:
        raise ValueError("ALIBABA_API_KEY is missing")
    if _alibaba_client is None:
        from openai import AsyncOpenAI
        _alibaba_client = AsyncOpenAI(
            api_key=settings.alibaba_api_key,
            base_url=settings.alibaba_base_url,
            timeout=7,
            max_retries=0,
        )
    return _alibaba_client


def _get_hf_embeddings():
    global _hf_embeddings
    settings = get_settings()
    if not settings.huggingface_api_key:
        raise ValueError("HUGGINGFACE_API_KEY is missing")
    if _hf_embeddings is None:
        from langchain_huggingface import HuggingFaceEndpointEmbeddings
        _hf_embeddings = HuggingFaceEndpointEmbeddings(
            model=_model_name().removeprefix("hf/"),
            huggingfacehub_api_token=settings.huggingface_api_key,
        )
    return _hf_embeddings


def _validate_vectors(vectors: list[list[float]], count: int) -> list[list[float]]:
    dimension = get_embedding_dimension()
    if len(vectors) != count:
        raise ValueError("Embedding response count does not match the input count")
    for vector in vectors:
        if len(vector) != dimension:
            raise ValueError(f"Embedding response dimension={len(vector)}, expected={dimension}")
        if not all(math.isfinite(value) for value in vector) or not any(vector):
            raise ValueError("Embedding response contains a zero or non-finite vector")
    return vectors


async def get_text_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if any(not text.strip() for text in texts):
        raise ValueError("Cannot embed empty text")
    settings = get_settings()
    model = _model_name()
    lower = model.lower()
    dimension = get_embedding_dimension()
    if lower in _ALIBABA_DIMENSIONS:
        client = _get_alibaba_client()
        batch_size = 20 if lower == "qwen3.7-text-embedding" else 10
        vectors = []
        for start in range(0, len(texts), batch_size):
            batch = texts[start:start + batch_size]
            response = await client.embeddings.create(
                model=model, input=batch, dimensions=dimension, encoding_format="float",
            )
            data = sorted(response.data, key=lambda item: item.index)
            if [item.index for item in data] != list(range(len(batch))):
                raise ValueError("Embedding response indices are missing or duplicated")
            vectors.extend(_validate_vectors([item.embedding for item in data], len(batch)))
        return vectors
    if any(key in lower for key in ["sentence-transformers", "minilm", "bge", "e5", "qwen", "gte", "hf/"]):
        vectors = await asyncio.to_thread(_get_hf_embeddings().embed_documents, texts)
    elif "gemini" in lower or "004" in lower:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is missing")
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        model = model if "models/" in model else f"models/{model}"
        vectors = await GoogleGenerativeAIEmbeddings(
            model=model, google_api_key=settings.gemini_api_key,
        ).aembed_documents(texts)
    else:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is missing")
        from openai import AsyncOpenAI
        options = {"dimensions": dimension} if lower.startswith("text-embedding-3-") else {}
        async with AsyncOpenAI(api_key=settings.openai_api_key, timeout=7, max_retries=0) as client:
            response = await client.embeddings.create(model=model, input=texts, **options)
            vectors = [item.embedding for item in sorted(response.data, key=lambda item: item.index)]
    return _validate_vectors(vectors, len(texts))


async def get_text_embedding(text: str) -> list[float]:
    return (await get_text_embeddings([text]))[0]
