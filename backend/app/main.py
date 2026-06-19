from pathlib import Path
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes.auth_routes import router as auth_router
from app.api.routes.database_routes import router as database_router
from app.api.routes.health_routes import router as health_router
from app.core.config import settings
print("CORS ORIGINS:", settings.get_cors_allowed_origins())

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes.database_catalog_routes import router as database_catalog_router
from app.api.routes.agent_catalog_routes import router as agent_catalog_router
from app.api.routes.audit_routes import router as audit_router

from app.core.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler
)


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"


app = FastAPI(
    title="DDP Business Data API",
    description="API local para consultar datos empresariales de forma controlada.",
    version="0.1.0"
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

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)

app.mount(
    "/styles",
    StaticFiles(directory=FRONTEND_DIR / "styles"),
    name="styles"
)

app.mount(
    "/js",
    StaticFiles(directory=FRONTEND_DIR / "js"),
    name="js"
)

app.mount(
    "/auth",
    StaticFiles(directory=FRONTEND_DIR / "auth"),
    name="auth"
)

app.mount(
    "/services",
    StaticFiles(directory=FRONTEND_DIR / "services"),
    name="services"
)


@app.get("/")
def root():
    return FileResponse(FRONTEND_DIR / "index.html")