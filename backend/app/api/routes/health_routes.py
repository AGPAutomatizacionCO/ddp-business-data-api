from fastapi import APIRouter
from app.services.database_service import check_database_connection, get_database_summary

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
def database_health():
    return check_database_connection()


@router.get("/summary")
def health_summary():
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