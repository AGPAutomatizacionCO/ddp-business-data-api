from fastapi import APIRouter, HTTPException
from app.services.database_service import (
    get_current_database,
    get_tables,
    get_columns
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