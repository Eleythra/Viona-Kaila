from typing import Optional, Literal
from pydantic import BaseModel, Field


LangCode = Literal["tr", "en", "de", "ru"]


class ChatRequest(BaseModel):
    message: str = Field(min_length=0, max_length=2500)
    ui_language: Optional[LangCode] = "tr"
    locale: Optional[LangCode] = "tr"
    conversation_language: Optional[LangCode] = Field(
        default=None,
        description=(
            "Oturum yanıt dili: önceki asistan cevabındaki meta.language ile istemci tarafından "
            "gönderilir. Verildiğinde şablon/RAG yanıtları bu dilde üretilir; kullanıcı aynı turda "
            "dil değiştirme ifadesi kullanırsa o kural önceliklidir."
        ),
    )
    user_id: Optional[str] = None

