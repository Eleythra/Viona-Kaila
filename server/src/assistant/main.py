"""
FastAPI ASGI application for the controlled assistant.

- Uvicorn / Render: ``uvicorn assistant.main:app --app-dir server/src`` (repo root)
  or from ``server/``: ``uvicorn assistant.main:app --app-dir src --host 0.0.0.0 --port $PORT``
- ``POST /api/chat`` is registered by ``assistant.api.routes_chat`` (router prefix ``/api``, path ``/chat``).
  Fallback ``POST /api/chat`` exists only if the router fails to load.

``assistant.*`` absolute imports need ``server/src`` on ``sys.path``. The block below prepends that
directory so imports stay consistent once this module is loading.

Note: Python must still resolve the ``assistant`` package first (e.g. ``uvicorn assistant.main:app
--app-dir server/src`` from repo root, or ``PYTHONPATH=server/src``, or ``cd server/src`` when using
``python -m``). This file cannot fix the very first package lookup before it runs.
"""
import sys
from pathlib import Path

_SRC_ROOT = Path(__file__).resolve().parent.parent  # .../server/src (parent of package ``assistant``)
if str(_SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(_SRC_ROOT))

from fastapi import FastAPI

from assistant.core.config import get_settings
from assistant.core.logger import get_logger
from assistant.schemas.response import ChatResponse, ChatMeta
from assistant.schemas.chat import ChatRequest
from assistant.services.localization_service import LocalizationService

logger = get_logger("assistant.main")
_I18N = LocalizationService()


def _safe_register_router(app: FastAPI) -> bool:
    """
    Never let router import/register crash the whole server.
    If chat routes fail, /api/chat returns a safe fallback.
    """
    try:
        from assistant.api.routes_chat import router as chat_router  # local import: avoid import-time crashes

        app.include_router(chat_router)
        return True
    except Exception:
        logger.exception("router_register_failed")

        # Minimal fallback endpoint to keep port binding stable.
        @app.post("/api/chat", response_model=ChatResponse)
        def chat_fallback(payload: ChatRequest):
            lang = payload.locale or payload.ui_language or "tr"
            safe_lang = _I18N.normalize_lang(lang)
            return ChatResponse(
                type="fallback",
                message=_I18N.canonical_fallback(safe_lang, reason="safe"),
                meta=ChatMeta(
                    intent="unknown",
                    confidence=0.0,
                    language=safe_lang,
                    ui_language=safe_lang,
                    source="fallback",
                ),
            )

        return False


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)

    # Absolute file existence checks (no relative paths).
    assistant_dir = __import__("pathlib").Path(__file__).resolve().parent
    rules_path = assistant_dir / "rules" / "routing_rules.yaml"
    rag_prompt_path = assistant_dir / "prompts" / "rag_answer.txt"

    env_loaded = True  # config.py loads env on import; here we just expose a stable boolean
    knowledge_file_exists = rules_path.exists() and rag_prompt_path.exists()

    has_openai_api_key = bool((settings.openai_api_key or "").strip())
    has_vector_store_id = bool((settings.openai_vector_store_id or "").strip())

    logger.info(
        "assistant_runtime_config has_openai_api_key=%s has_vector_store_id=%s knowledge_file_exists=%s",
        has_openai_api_key,
        has_vector_store_id,
        knowledge_file_exists,
    )

    routes_registered = _safe_register_router(app)

    @app.get("/api/health")
    def health():
        classifier_ready = has_openai_api_key
        rag_ready = has_openai_api_key and has_vector_store_id
        ok = routes_registered and knowledge_file_exists and (classifier_ready or rag_ready)

        return {
            "status": "ok" if ok else "degraded",
            "app_loaded": True,
            "config_loaded": True,
            "env_loaded": env_loaded,
            "knowledge_file_exists": knowledge_file_exists,
            "knowledge_loaded": knowledge_file_exists,
            "openai_configured": has_openai_api_key,
            "service_ready": routes_registered,
            "classifier_ready": classifier_ready,
            "rag_ready": rag_ready,
            "ok": ok,
            "service": settings.app_name,
            "env": settings.app_env,
        }

    # Optional convenience endpoint
    @app.get("/health")
    def health_public():
        return health()

    logger.info("assistant_startup_complete routes_registered=%s", routes_registered)
    return app


app = create_app()

