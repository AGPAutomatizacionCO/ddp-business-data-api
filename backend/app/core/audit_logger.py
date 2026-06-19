import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parents[2]
LOGS_DIR = BASE_DIR / "logs"

LOG_FILES = {
    "audit": "audit.jsonl",
    "auth": "auth.jsonl",
    "catalog": "catalog.jsonl",
    "preview": "preview.jsonl",
    "access_denied": "access_denied.jsonl",
    "errors": "errors.jsonl",
    "admin": "admin.jsonl",
}


def ensure_logs_dir() -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def safe_json_value(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value

    if isinstance(value, list):
        return [safe_json_value(item) for item in value]

    if isinstance(value, dict):
        return {
            str(key): safe_json_value(item)
            for key, item in value.items()
        }

    return str(value)


def get_request_context(request=None) -> dict:
    if request is None:
        return {}

    headers = getattr(request, "headers", {}) or {}

    return {
        "request_id": headers.get("X-Request-ID"),
        "client": headers.get("X-DDP-Client"),
        "user_agent": headers.get("User-Agent"),
        "method": getattr(request, "method", None),
        "url": str(getattr(request, "url", "")),
        "path": getattr(getattr(request, "url", None), "path", None),
    }


def write_audit_event(
    event_type: str,
    category: str = "audit",
    request=None,
    user: dict | None = None,
    resource: dict | None = None,
    result: str = "ok",
    details: dict | None = None,
) -> dict:
    ensure_logs_dir()

    normalized_category = category if category in LOG_FILES else "audit"

    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "category": normalized_category,
        "event_type": event_type,
        "result": result,
        "request": get_request_context(request),
        "user": safe_json_value(user or {}),
        "resource": safe_json_value(resource or {}),
        "details": safe_json_value(details or {}),
    }

    target_file = LOGS_DIR / LOG_FILES[normalized_category]
    general_file = LOGS_DIR / LOG_FILES["audit"]

    line = json.dumps(event, ensure_ascii=False)

    with target_file.open("a", encoding="utf-8") as file:
        file.write(line + "\n")

    if normalized_category != "audit":
        with general_file.open("a", encoding="utf-8") as file:
            file.write(line + "\n")

    return event