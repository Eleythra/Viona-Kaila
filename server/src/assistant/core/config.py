from functools import lru_cache
from pydantic import BaseModel, Field
import os
from pathlib import Path


def _load_env_once() -> None:
    # Single-source dotenv loading for assistant runtime.
    # Never rely on current working directory (uvicorn can be started from anywhere).
    # Use paths relative to this file.
    candidates = []
    server_dir = Path(__file__).resolve().parents[3]  # .../server
    project_dir = Path(__file__).resolve().parents[4]
    candidates.append(server_dir / ".env")
    candidates.append(project_dir / ".env")
    for env_path in candidates:
        if not env_path.exists():
            continue
        try:
            for line in env_path.read_text(encoding="utf-8").splitlines():
                row = line.strip()
                if not row or row.startswith("#") or "=" not in row:
                    continue
                key, value = row.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
            return
        except Exception:
            return


_load_env_once()


class Settings(BaseModel):
    app_name: str = "Viona Controlled Assistant"
    app_env: str = Field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    app_port: int = Field(default_factory=lambda: int(os.getenv("APP_PORT", "8010")))

    openai_api_key: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openai_model: str = Field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4.1-mini"))
    openai_classifier_model: str = Field(default_factory=lambda: os.getenv("OPENAI_CLASSIFIER_MODEL", "gpt-4.1-mini"))
    openai_model_intent: str = Field(default_factory=lambda: os.getenv("OPENAI_INTENT_MODEL", "gpt-4.1-mini"))
    openai_model_rag: str = Field(default_factory=lambda: os.getenv("OPENAI_RAG_MODEL", "gpt-4.1-mini"))
    openai_vector_store_id: str = Field(default_factory=lambda: os.getenv("OPENAI_VECTOR_STORE_ID", ""))
    openai_timeout_seconds: int = Field(default_factory=lambda: int(os.getenv("OPENAI_TIMEOUT_SECONDS", "20")))

    intent_confidence_threshold: float = Field(
        default_factory=lambda: float(os.getenv("INTENT_CONFIDENCE_THRESHOLD", "0.65"))
    )
    low_confidence_fallback_threshold: float = Field(
        default_factory=lambda: float(os.getenv("LOW_CONFIDENCE_FALLBACK_THRESHOLD", "0.60"))
    )
    rag_min_answer_length: int = Field(default_factory=lambda: int(os.getenv("RAG_MIN_ANSWER_LENGTH", "8")))
    rag_min_similarity_score: float = Field(default_factory=lambda: float(os.getenv("RAG_MIN_SIMILARITY_SCORE", "0.15")))
    rag_min_qualified_chunks: int = Field(default_factory=lambda: int(os.getenv("RAG_MIN_QUALIFIED_CHUNKS", "1")))
    rag_block_hedging_phrases: bool = Field(
        default_factory=lambda: os.getenv("RAG_BLOCK_HEDGING_PHRASES", "true").strip().lower() in ("1", "true", "yes")
    )
    throttle_window_seconds: int = Field(default_factory=lambda: int(os.getenv("THROTTLE_WINDOW_SECONDS", "10")))
    throttle_max_messages: int = Field(default_factory=lambda: int(os.getenv("THROTTLE_MAX_MESSAGES", "12")))
    allow_explicit_language_switch: bool = Field(
        default_factory=lambda: os.getenv("ALLOW_EXPLICIT_LANGUAGE_SWITCH", "true").strip().lower() in ("1", "true", "yes")
    )
    allow_implicit_language_drift: bool = Field(
        default_factory=lambda: os.getenv("ALLOW_IMPLICIT_LANGUAGE_DRIFT", "false").strip().lower() in ("1", "true", "yes")
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

