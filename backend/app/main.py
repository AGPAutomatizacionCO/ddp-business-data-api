from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes.auth_routes import router as auth_router
from app.api.routes.database_routes import router as database_router
from app.api.routes.health_routes import router as health_router

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

app = FastAPI(
    title="DDP Business Data API",
    description="API local para consultar datos empresariales de forma controlada.",
    version="0.1.0"
)


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

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)


@app.get("/")
def root():
    return FileResponse(FRONTEND_DIR / "index.html")