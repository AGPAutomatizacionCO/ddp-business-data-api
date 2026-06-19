from fastapi import APIRouter, Depends, Request

from app.core.access_control import ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER, require_roles
from app.core.audit_logger import write_audit_event
from app.core.database_catalog import get_database_catalog
from app.core.request_guard import require_frontend_request
from app.core.session import require_session
from app.services.database_service import (
    check_database_connection_by_id,
    get_database_summary_by_id,
    get_tables_by_database_id,
    get_table_preview_by_database_id,
    get_database_objects_by_id,
    get_database_object_definition_by_id,
)


router = APIRouter(
    prefix="/api/databases",
    tags=["Database Catalog"],
)


def get_session_user_info(session) -> dict:
    """
    Extrae información segura del usuario para auditoría.
    No debe incluir tokens ni información sensible.
    Soporta sesión como dict u objeto.
    """
    if session is None:
        return {}

    if isinstance(session, dict):
        user = session.get("user", session)

        if isinstance(user, dict):
            return {
                "name": user.get("name"),
                "email": user.get("email") or user.get("preferred_username"),
                "role": user.get("role"),
                "roles": user.get("roles"),
            }

        return {
            "session": str(session),
        }

    user = getattr(session, "user", session)

    return {
        "name": getattr(user, "name", None),
        "email": getattr(user, "email", None)
        or getattr(user, "preferred_username", None),
        "role": getattr(user, "role", None),
        "roles": getattr(user, "roles", None),
    }


@router.get("")
def list_databases(
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    write_audit_event(
        event_type="DATABASES_READ",
        category="catalog",
        request=request,
        user=get_session_user_info(session),
        resource={
            "resource_type": "database_catalog",
        },
        result="ok",
        details={
            "message": "Consulta de catálogo de bases configuradas.",
        },
    )

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

    result = check_database_connection_by_id(database_id)

    write_audit_event(
        event_type="DATABASE_HEALTH_READ",
        category="catalog",
        request=request,
        user=get_session_user_info(session),
        resource={
            "database_id": database_id,
            "resource_type": "database_health",
        },
        result="ok" if result.get("status") == "ok" else "error",
        details={
            "database_status": result.get("status"),
            "message": result.get("message"),
        },
    )

    return result


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

    write_audit_event(
        event_type="DATABASE_SUMMARY_READ",
        category="catalog",
        request=request,
        user=get_session_user_info(session),
        resource={
            "database_id": database_id,
            "resource_type": "database_summary",
        },
        result="ok" if db_status.get("status") == "ok" else "error",
        details={
            "database_status": db_status.get("status"),
            "summary": summary,
        },
    )

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

    tables = get_tables_by_database_id(database_id)

    write_audit_event(
        event_type="DATABASE_TABLES_READ",
        category="catalog",
        request=request,
        user=get_session_user_info(session),
        resource={
            "database_id": database_id,
            "resource_type": "database_tables",
        },
        result="ok",
        details={
            "items_count": len(tables),
        },
    )

    return {
        "status": "ok",
        "data": tables,
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

    preview_data = get_table_preview_by_database_id(
        database_id=database_id,
        schema_name=schema_name,
        table_name=table_name,
        start_record=start_record,
        end_record=end_record,
    )

    write_audit_event(
        event_type="DATABASE_TABLE_PREVIEW_READ",
        category="preview",
        request=request,
        user=get_session_user_info(session),
        resource={
            "database_id": database_id,
            "schema_name": schema_name,
            "table_name": table_name,
            "resource_type": "table_preview",
        },
        result="ok",
        details={
            "start_record": start_record,
            "end_record": end_record,
            "returned_rows": len(preview_data) if isinstance(preview_data, list) else None,
        },
    )

    return {
        "status": "ok",
        "data": preview_data,
    }


@router.get("/{database_id}/objects")
def database_objects(
    database_id: str,
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    objects = get_database_objects_by_id(database_id)

    write_audit_event(
        event_type="DATABASE_OBJECTS_READ",
        category="catalog",
        request=request,
        user=get_session_user_info(session),
        resource={
            "database_id": database_id,
            "resource_type": "database_objects",
        },
        result="ok",
        details={
            "items_count": len(objects),
        },
    )

    return {
        "status": "ok",
        "data": objects,
    }


@router.get("/{database_id}/objects/{object_type}/{schema_name}/{object_name}/definition")
def database_object_definition(
    database_id: str,
    object_type: str,
    schema_name: str,
    object_name: str,
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST])

    definition = get_database_object_definition_by_id(
        database_id=database_id,
        object_type=object_type,
        schema_name=schema_name,
        object_name=object_name,
    )

    write_audit_event(
        event_type="DATABASE_OBJECT_DEFINITION_READ",
        category="catalog",
        request=request,
        user=get_session_user_info(session),
        resource={
            "database_id": database_id,
            "schema_name": schema_name,
            "object_name": object_name,
            "object_type": object_type,
            "resource_type": "object_definition",
        },
        result="ok",
        details={
            "has_definition": bool(
                definition.get("definition")
                if isinstance(definition, dict)
                else definition
            ),
        },
    )

    return {
        "status": "ok",
        "data": definition,
    }