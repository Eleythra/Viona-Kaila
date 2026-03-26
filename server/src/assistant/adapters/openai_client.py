from openai import OpenAI
from assistant.core.logger import get_logger


logger = get_logger("assistant.openai")


class OpenAIClientAdapter:
    def __init__(self, api_key: str, timeout_seconds: int = 20):
        self.api_key = (api_key or "").strip()
        self.client = OpenAI(api_key=self.api_key or "missing", timeout=timeout_seconds)

    def responses_create(self, **kwargs):
        if not self.api_key:
            raise RuntimeError("missing_api_key")
        try:
            return self.client.responses.create(**kwargs)
        except Exception as exc:
            status = getattr(exc, "status_code", None)
            if status == 401:
                logger.warning("openai_401")
                raise RuntimeError("openai_401") from exc
            raise

