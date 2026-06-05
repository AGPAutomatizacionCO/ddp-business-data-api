from fastapi import APIRouter, HTTPException, Query
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
def current_database():
    try:
        return {
            "status": "ok",
            "data": get_current_database()
        }
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection error: {str(error)}"
        )


@router.get("/tables")
def tables():
    try:
        return {
            "status": "ok",
            "data": get_tables()
        }
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Database tables error: {str(error)}"
        )


@router.get("/columns")
def columns():
    try:
        return {
            "status": "ok",
            "data": get_columns()
        }
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Database columns error: {str(error)}"
        )
    
@router.get("/tables/{schema_name}/{table_name}/columns")
def table_columns(schema_name: str, table_name: str):
    try:
        return {
            "status": "ok",
            "data": get_table_columns(schema_name, table_name)
        }
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Table columns error: {str(error)}"
        )


@router.get("/tables/{schema_name}/{table_name}/preview")
def table_preview(
    schema_name: str,
    table_name: str,
    start_record: int = Query(default=1, ge=1),
    end_record: int = Query(default=20, ge=1)
):
    try:
        return {
            "status": "ok",
            "data": get_table_preview(
                schema_name=schema_name,
                table_name=table_name,
                start_record=start_record,
                end_record=end_record
            )
        }
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Table preview error: {str(error)}"
        )
    