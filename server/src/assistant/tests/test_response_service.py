import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.services.response_service import ResponseService  # noqa: E402


def test_response_service_strips_inline_citation_artifacts():
    service = ResponseService()
    res = service.build(
        type_="answer",
        message="Spa saatleri 09:00-19:00【5:16,17†kaila_beach_full_detailed_guide.md】",
        intent="hotel_info",
        confidence=0.9,
        language="tr",
        ui_language="tr",
        source="rag",
    )
    assert "【" not in res.message
    assert "†" not in res.message
