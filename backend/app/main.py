import logging
import uuid
from contextlib import asynccontextmanager

import pyodbc
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes.auth_routes import router as auth_router
from app.api.routes.database_routes import router as database_router
from app.api.routes.health_routes import router as health_router
from app.api.routes.database_catalog_routes import router as database_catalog_router
from app.api.routes.agent_catalog_routes import router as agent_catalog_router
from app.api.routes.audit_routes import router as audit_router
from app.api.routes.query_routes import router as query_router

from app.core.config import settings
from app.core.database_catalog import get_database_connection
from app.core.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.services.database_service import build_connection_string_from_config

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[startup] DDP Business Data API iniciando.")

    connection_ids = settings.get_database_connection_ids()

    if not connection_ids:
        logger.warning("[startup] No hay bases configuradas en DB_CONNECTIONS.")
    else:
        for db_id in connection_ids:
            try:
                config = get_database_connection(db_id)
                conn_str = build_connection_string_from_config(config)

                with pyodbc.connect(conn_str, timeout=5) as conn:
                    conn.cursor().execute("SELECT 1")

                logger.info(f"[startup] Base '{db_id}' ({config.database}) accesible.")
            except Exception as exc:
                logger.warning(f"[startup] Base '{db_id}' no accesible: {exc}")

    yield

    logger.info("[startup] DDP Business Data API detenida.")


app = FastAPI(
    title="DDP Business Data API",
    description="API local para consultar datos empresariales de forma controlada.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_exception_handler(
    StarletteHTTPException,
    http_exception_handler
)

app.add_exception_handler(
    RequestValidationError,
    validation_exception_handler
)

app.add_exception_handler(
    Exception,
    unhandled_exception_handler
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_allowed_origins(),
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "OPTIONS",
    ],
    allow_headers=[
        "Content-Type",
        "X-DDP-Client",
        "X-Request-ID",
    ],
)
@app.middleware("http")
async def add_request_id(request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())

    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    return response

@app.middleware("http")
async def add_no_store_headers(request, call_next):
    response = await call_next(request)

    protected_paths = (
        "/api/database",
        "/health/db",
        "/health/summary",
        "/auth/session",
        "/auth/me",
        "/auth/logout"
    )

    if request.url.path.startswith(protected_paths):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    return response


app.include_router(health_router)
app.include_router(database_router)
app.include_router(auth_router)
app.include_router(database_catalog_router)
app.include_router(agent_catalog_router)
app.include_router(audit_router)
app.include_router(query_router)

