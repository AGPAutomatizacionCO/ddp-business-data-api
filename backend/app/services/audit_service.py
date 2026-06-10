import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Request


BACKEND_DIR = Path(__file__).resolve().parents[2]
LOGS_DIR = BACKEND_DIR / "logs"
AUDIT_LOG_FILE = LOGS_DIR / "audit.jsonl"


def get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    if request.client:
        return request.client.host

    return None


def write_audit_log(
    request: Request,
    session: dict,
    action: str,
    resource_type: str,
    resource_name: str | None = None,
    details: dict | None = None
) -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    user = session.get("user", {})

    audit_event = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "resource_type": resource_type,
        "resource_name": resource_name,
        "details": details or {},
        "user": {
            "name": user.get("name"),
            "username": user.get("username"),
            "role": user.get("role"),
            "tenant_id": user.get("tenant_id"),
            "local_account_id": user.get("local_account_id"),
            "oid": user.get("oid")
        },
        "request": {
            "method": request.method,
            "path": request.url.path,
            "query": str(request.url.query),
            "client_ip": get_client_ip(request),
            "user_agent": request.headers.get("user-agent")
        }
    }

    with AUDIT_LOG_FILE.open("a", encoding="utf-8") as file:
        file.write(json.dumps(audit_event, ensure_ascii=False) + "\n")