import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.main import app  # noqa: E402


def test_fault_rule_redirect_cases():
    client = TestClient(app)
    inputs = [
        "televizyonum bozuldu",
        "klima çalışmıyor",
        "kapı kartı açılmıyor",
        "ışık yanmıyor",
        "duş bozuk",
    ]
    for msg in inputs:
        response = client.post(
            "/api/chat",
            json={"message": msg, "ui_language": "tr", "locale": "tr"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "inform"
        assert data["meta"]["intent"] == "fault_report"
        assert data["meta"].get("action", {}).get("kind") == "chat_form"
        assert data["meta"]["action"].get("operation") == "fault"

