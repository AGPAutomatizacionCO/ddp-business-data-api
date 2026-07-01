from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.access_control import ROLE_ADMIN, ROLE_ANALYST, require_roles
from app.core.audit_logger import write_audit_event
from app.core.request_guard import require_frontend_request
from app.core.session import require_session
from app.schemas.query_schema import SimpleQueryRequest
from app.services.query_service import execute_simple_query, get_queryable_columns


router = APIRouter(
    prefix="/api/queries",
    tags=["Operative Queries"],
)


def _get_user_info(session) -> dict:
    if session is None:
        return {}
    if isinstance(session, dict):
        user = session.get("user", session)
        if isinstance(user, dict):
            return {
                "name": user.get("name"),
                "email": user.get("email") or user.get("preferred_username"),
                "role": user.get("role"),
            }
    user = getattr(session, "user", session)
    return {
        "name": getattr(user, "name", None),
        "email": getattr(user, "email", None) or getattr(user, "preferred_username", None),
        "role": getattr(user, "role", None),
    }


@router.get("/{database_id}/{schema_name}/{table_name}/columns")
def query_columns(
    database_id: str,
    schema_name: str,
    table_name: str,
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST])

    try:
        columns = get_queryable_columns(database_id, schema_name, table_name)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))

    write_audit_event(
        event_type="QUERY_COLUMNS_READ",
        category="query",
        request=request,
        user=_get_user_info(session),
        resource={
            "database_id": database_id,
            "schema_name": schema_name,
            "table_name": table_name,
            "resource_type": "query_columns",
        },
        result="ok",
        details={"columns_count": len(columns)},
    )

    return {
        "status": "ok",
        "data": columns,
    }


@router.post("/execute")
def query_execute(
    payload: SimpleQueryRequest,
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request),
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST])

    try:
        result = execute_simple_query(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    write_audit_event(
        event_type="SIMPLE_QUERY_EXECUTED",
        category="query",
        request=request,
        user=_get_user_info(session),
        resource={
            "database_id": payload.database_id,
            "schema_name": payload.schema_name,
            "table_name": payload.table_name,
            "resource_type": "operative_query",
        },
        result="ok",
        details={
            "index_columns": payload.index_columns,
            "index_tuples_count": len(payload.index_tuples),
            "output_columns_count": len(payload.output_columns),
            "rows_returned": result.get("rows_returned"),
            "execution_time_ms": result.get("execution_time_ms"),
        },
    )

    return {
        "status": "ok",
        "data": result,
    }
