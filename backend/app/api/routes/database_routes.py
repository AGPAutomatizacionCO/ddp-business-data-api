from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.access_control import ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER, require_roles, has_role_permission
from app.core.request_guard import require_frontend_request
from app.core.session import require_session
from app.services.audit_service import write_audit_log
from app.services.database_service import (
    get_current_database,
    get_tables,
    get_columns,
    get_table_columns,
    get_table_preview
)


router = APIRouter(
    prefix="/api/database",
    tags=["Database"]
)


@router.get("/current")
def current_database(
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request)
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    result = get_current_database()

    write_audit_log(
        request=request,
        session=session,
        action="database.current.read",
        resource_type="database",
        resource_name=result.get("database_name") if isinstance(result, dict) else None
    )

    return {
        "status": "ok",
        "data": result
    }


@router.get("/tables")
def list_tables(
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request)
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST, ROLE_VIEWER])

    result = get_tables()

    write_audit_log(
        request=request,
        session=session,
        action="database.tables.list",
        resource_type="database_tables",
        details={
            "returned_tables": len(result)
        }
    )

    return {
        "status": "ok",
        "data": result
    }


@router.get("/columns")
def list_columns(
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request)
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST])

    result = get_columns()

    write_audit_log(
        request=request,
        session=session,
        action="database.columns.list",
        resource_type="database_columns",
        details={
            "returned_columns": len(result)
        }
    )

    return {
        "status": "ok",
        "data": result
    }


@router.get("/tables/{schema_name}/{table_name}/columns")
def list_table_columns(
    schema_name: str,
    table_name: str,
    request: Request,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request)
):
    require_roles(session, [ROLE_ADMIN, ROLE_ANALYST])

    result = get_table_columns(schema_name, table_name)

    write_audit_log(
        request=request,
        session=session,
        action="database.table.columns.read",
        resource_type="table",
        resource_name=f"{schema_name}.{table_name}",
        details={
            "schema_name": schema_name,
            "table_name": table_name,
            "returned_columns": len(result)
        }
    )

    return {
        "status": "ok",
        "data": result
    }


@router.get("/tables/{schema_name}/{table_name}/preview")
def table_preview(
    schema_name: str,
    table_name: str,
    request: Request,
    start_record: int = 1,
    end_record: int = 20,
    session=Depends(require_session),
    frontend=Depends(require_frontend_request)
):
    if not has_role_permission(session, [ROLE_ADMIN, ROLE_ANALYST]):
        write_audit_log(
            request=request,
            session=session,
            action="database.table.preview.denied",
            resource_type="table",
            resource_name=f"{schema_name}.{table_name}",
            details={
                "schema_name": schema_name,
                "table_name": table_name,
                "start_record": start_record,
                "end_record": end_record,
                "reason": "role_not_allowed"
            }
        )

        raise HTTPException(
            status_code=403,
            detail="User does not have permission to perform this action."
        )

    try:
        result = get_table_preview(
            schema_name=schema_name,
            table_name=table_name,
            start_record=start_record,
            end_record=end_record
        )

        write_audit_log(
            request=request,
            session=session,
            action="database.table.preview.read",
            resource_type="table",
            resource_name=f"{schema_name}.{table_name}",
            details={
                "schema_name": schema_name,
                "table_name": table_name,
                "start_record": start_record,
                "end_record": end_record,
                "returned_records": result.get("returned_records"),
                "total_records": result.get("total_records"),
                "sensitive_columns": result.get("sensitive_columns", [])
            }
        )

        return {
            "status": "ok",
            "data": result
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )