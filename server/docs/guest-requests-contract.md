# Guest Requests Integration Contract

This contract defines the stable `meta.action` payload emitted by the assistant response.

## Source

- Endpoint: `POST /api/chat`
- Response object: `ChatResponse`
- Action location: `response.meta.action`

## Action Types

### 1) create_guest_request

Used for operational intents that require handoff:

- `fault_report`
- `complaint`
- `request`
- `reservation`
- `special_need`

Payload shape:

```json
{
  "kind": "create_guest_request",
  "target_department": "reception | guest_relations",
  "priority": "low | medium | high",
  "sub_intent": "string | null",
  "entity": "string | null",
  "issue_type": "string | null",
  "policy_hint": "string | null"
}
```

Operational mapping:

- `complaint` and `special_need` -> `target_department=guest_relations`, `priority=high`
- `fault_report` -> `target_department=reception`, `priority=medium`
- `request` and `reservation` -> `target_department=reception`, `priority=low`

### 2) suggest_venue

Used for `recommendation` responses.

Payload shape:

```json
{
  "kind": "suggest_venue",
  "venue_id": "string",
  "entity": "string | null",
  "sub_intent": "string | null"
}
```

Known venue mapping:

- `fish` -> `mare_restaurant`
- `meat` -> `sinton_bbq`
- `coffee_dessert` -> `libum_cafe`
- unknown -> `libum_cafe` (safe default)

## Consumer Rules

- Consumers must treat `meta.action` as optional.
- If `meta.action` is missing, no downstream ticket creation should occur.
- Consumers must not infer workflow from response text; use only `meta.action`.
- Unknown future fields must be ignored for forward compatibility.
