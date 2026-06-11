from fastapi import APIRouter, Depends, Request

from app.core.access_control import ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER, require_roles
from app.core.database_catalog import get_database_catalog
from app.core.request_guard import require_frontend_request
from app.core.session import require_session
from app.services.database_service import (
    check_database_connection_by_id,
    get_database_summary_by_id,
    get_tables_by_database_id,
    get_table_preview_by_database_id,
)


router = APIRouter(
    prefix="/api/databases",
    tags=["Database Catalog"],
)


@router.get("")
def list_databases(
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    return {
        "status": "ok",
        "data": get_database_catalog(),
    }


@router.get("/{database_id}/health")
def database_health(
    database_id: str,
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    return check_database_connection_by_id(database_id)


@router.get("/{database_id}/summary")
def database_summary(
    database_id: str,
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    db_status = check_database_connection_by_id(database_id)

    summary = {
        "database_id": database_id,
        "total_schemas": 0,
        "total_tables": 0,
    }

    if db_status["status"] == "ok":
        summary = get_database_summary_by_id(database_id)

    return {
        "api": {
            "status": "ok",
            "service": "DDP Business Data API",
            "version": "0.1.0",
        },
        "database": db_status,
        "summary": summary,
    }


@router.get("/{database_id}/tables")
def database_tables(
    database_id: str,
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    return {
        "status": "ok",
        "data": get_tables_by_database_id(database_id),
    }
@router.get("/{database_id}/tables/{schema_name}/{table_name}/preview")
def database_table_preview(
    database_id: str,
    schema_name: str,
    table_name: str,
    request: Request,
    start_record: int = 1,
    end_record: int = 20,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST])

    return {
        "status": "ok",
        "data": get_table_preview_by_database_id(
            database_id=database_id,
            schema_name=schema_name,
            table_name=table_name,
            start_record=start_record,
            end_record=end_record,
        ),
    }