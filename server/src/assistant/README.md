# Controlled Assistant (FastAPI)

## Refactor Plan
1. Keep existing Node flow untouched for backward compatibility.
2. Add controlled orchestrated backend under `server/src/assistant`.
3. Move decision logic into Rule Engine -> Intent Service -> Policy -> RAG.
4. Return strict unified JSON response schema for frontend.
5. Make localization centralized and deterministic.

## Folder Layout
- `api/` endpoint layer
- `core/` config and logger
- `schemas/` request/response/intent contracts
- `services/` orchestrator and domain services
- `adapters/` OpenAI + vector-store access
- `rules/` YAML deterministic rules
- `prompts/` LLM prompts
- `utils/` text normalization

## Run
```bash
pip install -r server/requirements.txt
uvicorn assistant.main:app --app-dir server/src --reload --port 8010
```

## Standard Response Schema
```json
{
  "type": "answer | redirect | inform | fallback",
  "message": "string",
  "meta": {
    "intent": "fault_report | complaint | request | special_need | hotel_info | unknown",
    "confidence": 0.0,
    "language": "tr|en|de|ru",
    "ui_language": "tr|en|de|ru",
    "source": "rule|llm|rag|fallback"
  }
}
```

## Example Requests/Responses
### Fault redirect
Request:
```json
{"message":"televizyon çalışmıyor","ui_language":"tr","locale":"tr"}
```
Response:
```json
{
  "type":"redirect",
  "message":"Bu sorun için lütfen Arıza Talep formunu doldurunuz.",
  "meta":{"intent":"fault_report","confidence":0.95,"language":"tr","ui_language":"tr","source":"rule"}
}
```

### Special need
Request:
```json
{"message":"I have gluten sensitivity","ui_language":"tr","locale":"en"}
```
Response:
```json
{
  "type":"inform",
  "message":"For this matter, please contact Guest Relations.",
  "meta":{"intent":"special_need","confidence":0.95,"language":"en","ui_language":"tr","source":"rule"}
}
```

### Hotel info with RAG
Request:
```json
{"message":"Moss Beach nerede?","ui_language":"tr","locale":"tr"}
```
Response: `answer` if grounded, otherwise `fallback`.

## Edge Cases
- Empty/invalid message -> validation error (Pydantic).
- Rule miss + low confidence classification -> fallback.
- RAG not found -> fallback.
- Missing OpenAI/vector store -> service should fallback/log (extend with hard checks in production).

## Production Notes
- Put strict timeout and retries in OpenAI adapter.
- Add request ID and structured JSON logs.
- Add rate limiting and auth at API gateway.
- Add metrics: intent distribution, fallback ratio, RAG hit ratio.
- Add circuit-breaker when OpenAI is unavailable.

## Extensibility Notes
- Add new intent by updating:
  1) `schemas/intent.py`
  2) `rules/routing_rules.yaml`
  3) `services/policy_service.py`
  4) localization keys if needed
- Reservation routing can be added as new policy without touching endpoint contract.
