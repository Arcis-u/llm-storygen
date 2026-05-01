"""
Core configuration module.
Loads environment variables and provides typed settings across the application.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Server ---
    backend_host: str = Field(default="0.0.0.0")
    backend_port: int = Field(default=8000)
    frontend_url: str = Field(default="http://localhost:3000")

    # --- Database ---
    mongodb_url: str = Field(default="mongodb://localhost:27017")
    mongodb_db_name: str = Field(default="interactive_story")
    qdrant_url: str = Field(default="http://localhost:6333")
    qdrant_api_key: str = Field(default="")
    qdrant_collection_name: str = Field(default="story_memory")
    
    # --- Admin Dashboard ---
    admin_password: str = Field(default="secret_admin_123")

    # --- LLM API Keys ---
    openai_api_key: str = Field(default="")
    anthropic_api_key: str = Field(default="")
    gemini_api_key: str = Field(default="")
    groq_api_key: str = Field(default="")
    huggingface_api_key: str = Field(default="")
    alibaba_api_key: str = Field(default="")

    # --- AI Model Selection ---
    director_model: str = Field(default="hf/Qwen/Qwen2.5-72B-Instruct")
    writer_model: str = Field(default="hf/Qwen/Qwen2.5-72B-Instruct")
    editor_model: str = Field(default="hf/mistralai/Mistral-Small-24B-Instruct-2501")
    gamemaster_model: str = Field(default="hf/mistralai/Mistral-Small-24B-Instruct-2501")
    embedding_model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Singleton pattern: returns cached Settings instance."""
    return Settings()
