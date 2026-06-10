from fastapi import APIRouter, Depends, Request

from app.core.access_control import ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER, require_roles
from app.core.request_guard import require_frontend_request
from app.core.session import require_session
from app.services.database_service import (
    check_database_connection,
    get_database_summary
)


router = APIRouter(
    prefix="/health",
    tags=["Health"]
)


@router.get("")
def api_health():
    return {
        "status": "ok",
        "service": "DDP Business Data API",
        "version": "0.1.0"
    }


@router.get("/db")
def database_health(
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request)
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    return check_database_connection()


@router.get("/summary")
def health_summary(
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request)
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    db_status = check_database_connection()

    summary = {
        "total_schemas": 0,
        "total_tables": 0
    }

    if db_status["status"] == "ok":
        summary = get_database_summary()

    return {
        "api": {
            "status": "ok",
            "service": "DDP Business Data API",
            "version": "0.1.0"
        },
        "database": db_status,
        "summary": summary
    }