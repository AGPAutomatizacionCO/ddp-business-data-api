import json
from pathlib import Path

from fastapi import APIRouter, Depends, Query, Request

from app.core.access_control import ROLE_ADMIN, require_roles
from app.core.request_guard import require_frontend_request
from app.core.session import require_session


router = APIRouter(
    prefix="/api/audit",
    tags=["Audit"],
)


BASE_DIR = Path(__file__).resolve().parents[3]
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


def read_jsonl_file(category: str, limit: int = 100) -> list[dict]:
    file_name = LOG_FILES.get(category)

    if not file_name:
        return []

    file_path = LOGS_DIR / file_name

    if not file_path.exists():
        return []

    events = []

    with file_path.open("r", encoding="utf-8") as file:
        for line in file:
            clean_line = line.strip()

            if not clean_line:
                continue

            try:
                events.append(json.loads(clean_line))
            except json.JSONDecodeError:
                events.append(
                    {
                        "timestamp": None,
                        "category": category,
                        "event_type": "INVALID_LOG_LINE",
                        "result": "error",
                        "details": {
                            "raw": clean_line,
                        },
                    }
                )

    events.reverse()

    return events[:limit]


@router.get("/events")
def list_audit_events(
    request: Request,
    category: str = Query("audit"),
    limit: int = Query(100, ge=1, le=500),
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN])

    events = read_jsonl_file(category=category, limit=limit)

    return {
        "status": "ok",
        "category": category,
        "limit": limit,
        "total": len(events),
        "data": events,
    }


@router.get("/summary")
def audit_summary(
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN])

    summary = []

    for category, file_name in LOG_FILES.items():
        file_path = LOGS_DIR / file_name

        if not file_path.exists():
            count = 0
        else:
            with file_path.open("r", encoding="utf-8") as file:
                count = sum(1 for line in file if line.strip())

        summary.append(
            {
                "category": category,
                "file": file_name,
                "events": count,
            }
        )

    return {
        "status": "ok",
        "data": summary,
    }