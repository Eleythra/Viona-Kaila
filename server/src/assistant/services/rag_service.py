import json
import re
from pathlib import Path

from assistant.core.config import Settings
from assistant.core.logger import get_logger
from assistant.adapters.openai_client import OpenAIClientAdapter
from assistant.utils.json_extract import parse_json_loose

logger = get_logger("assistant.rag")

RAG_BLOCKED_PHRASES = [
    "muhtemelen",
    "anlaşılıyor",
    "anlasiliyor",
    "net değil",
    "net degil",
    "görünüşe göre",
    "gorunuse gore",
]

CONTRADICTION_PAIRS = []

_RAG_JSON_RETRY_SUFFIX = (
    "\n\nOutput a single JSON object only, exactly matching the schema. "
    "No markdown, no code fences, no text before or after the JSON."
)


class RagService:
    def __init__(self, settings: Settings, openai_adapter: OpenAIClientAdapter, prompt_path: Path):
        self.settings = settings
        self.openai = openai_adapter
        self.prompt = prompt_path.read_text(encoding="utf-8")
        self.last_reason = "not_called"

    def answer(self, message: str, language: str) -> str | None:
        self.last_reason = "started"
        if not (self.settings.openai_vector_store_id or "").strip():
            logger.warning("missing_vector_store_id")
            self.last_reason = "missing_vector_store_id"
            return None
        try:
            response = self.openai.responses_create(
                model=self.settings.openai_model_rag,
                input=message,
                instructions=f"{self.prompt}\nRespond in language: {language}",
                tools=[
                    {
                        "type": "file_search",
                        "vector_store_ids": [self.settings.openai_vector_store_id],
                        "max_num_results": 6,
                    }
                ],
                include=["file_search_call.results"],
            )

            qualified_chunks, chunk_stats = self._qualified_chunks(response)
            if len(qualified_chunks) < self.settings.rag_min_qualified_chunks:
                logger.info(
                    "rag_rejected_low_chunks count=%s stats=%s min_required=%s",
                    len(qualified_chunks),
                    chunk_stats,
                    self.settings.rag_min_qualified_chunks,
                )
                self.last_reason = "low_chunks"
                return None

            if self._has_contradiction(qualified_chunks, message):
                logger.info("rag_rejected_contradiction")
                self.last_reason = "contradiction"
                return None

            raw = (response.output_text or "").strip()
            payload = self._parse_structured_with_retry(message, language, raw)
            if not payload.get("found"):
                logger.info("rag_rejected_parse_or_not_found")
                self.last_reason = "parse_or_not_found"
                return None

            answer = " ".join(str(payload.get("answer", "")).strip().split())
            if not answer:
                logger.info("rag_rejected_empty_answer")
                self.last_reason = "empty_answer"
                return None
            if len(answer) < self.settings.rag_min_answer_length:
                logger.info(
                    "rag_rejected_short_answer length=%s min=%s",
                    len(answer),
                    self.settings.rag_min_answer_length,
                )
                self.last_reason = "short_answer"
                return None
            lowered = answer.lower()
            if self.settings.rag_block_hedging_phrases and any(p in lowered for p in RAG_BLOCKED_PHRASES):
                logger.info("rag_rejected_hedging_phrase")
                self.last_reason = "hedging_phrase"
                return None
            if not self.settings.rag_block_hedging_phrases and any(p in lowered for p in RAG_BLOCKED_PHRASES):
                logger.info("rag_allowed_despite_hedging_phrase rag_block_hedging_phrases=false")
            self.last_reason = "ok"
            return answer
        except Exception as exc:
            reason = "rag_failure"
            text = str(exc)
            if "missing_api_key" in text:
                reason = "missing_api_key"
            elif "openai_401" in text:
                reason = "openai_401"
            elif "openai_429" in text:
                reason = "openai_429"
            elif "openai_timeout" in text:
                reason = "openai_timeout"
            elif "openai_bad_response" in text:
                reason = "openai_bad_response"
            logger.warning("rag_failed_or_timeout reason=%s error=%s", reason, exc)
            self.last_reason = reason
            return None

    def _try_parse_structured(self, raw: str) -> dict | None:
        data = parse_json_loose(raw)
        if not isinstance(data, dict):
            return None
        found = bool(data.get("found", False))
        answer = str(data.get("answer", "") or "")
        return {"found": found, "answer": answer}

    def _parse_structured_with_retry(self, message: str, language: str, raw: str) -> dict:
        payload = self._try_parse_structured(raw)
        if payload is not None:
            return payload
        logger.info("rag_parse_retry after_invalid_json_output")
        try:
            response = self.openai.responses_create(
                model=self.settings.openai_model_rag,
                input=message,
                instructions=f"{self.prompt}\nRespond in language: {language}{_RAG_JSON_RETRY_SUFFIX}",
                tools=[
                    {
                        "type": "file_search",
                        "vector_store_ids": [self.settings.openai_vector_store_id],
                        "max_num_results": 6,
                    }
                ],
                include=["file_search_call.results"],
            )
            raw2 = (response.output_text or "").strip()
            payload2 = self._try_parse_structured(raw2)
            if payload2 is not None:
                return payload2
        except Exception as exc:
            logger.warning("rag_parse_retry_failed error=%s", exc)
        return {"found": False, "answer": ""}

    def _qualified_chunks(self, response) -> tuple[list[str], dict[str, int]]:
        def read(obj, key, default=None):
            if isinstance(obj, dict):
                return obj.get(key, default)
            return getattr(obj, key, default)

        chunks: list[str] = []
        stats = {"with_score_ok": 0, "below_score": 0, "no_score": 0}
        threshold = self.settings.rag_min_similarity_score
        for item in read(response, "output", []) or []:
            if read(item, "type", "") != "file_search_call":
                continue
            results = read(item, "results", []) or []
            for r in results:
                score = read(r, "score", None)
                text = read(r, "text", "") or ""
                if score is None:
                    stats["no_score"] += 1
                    chunks.append(str(text).strip())
                    continue
                if float(score) >= threshold:
                    stats["with_score_ok"] += 1
                    chunks.append(str(text).strip())
                else:
                    stats["below_score"] += 1
        filtered = [c for c in chunks if c]
        logger.info(
            "rag_chunk_stats qualified_texts=%s min_score=%.3f stats=%s",
            len(filtered),
            threshold,
            stats,
        )
        return filtered, stats

    def _has_contradiction(self, chunks: list[str], message: str) -> bool:
        # Restrict contradiction checks to chunks relevant to the current query
        # to avoid false rejects from unrelated hotel facts.
        query_tokens = {
            t
            for t in re.findall(r"[a-zA-ZçğıöşüÇĞİÖŞÜа-яА-ЯёЁ]+", (message or "").lower())
            if len(t) >= 4
        }
        if not query_tokens:
            relevant_chunks = chunks
        else:
            relevant_chunks = [c for c in chunks if any(tok in c.lower() for tok in query_tokens)]
            if not relevant_chunks:
                relevant_chunks = chunks

        merged = " ".join(relevant_chunks).lower()
        for a, b in CONTRADICTION_PAIRS:
            if a in merged and b in merged:
                return True
        return False
