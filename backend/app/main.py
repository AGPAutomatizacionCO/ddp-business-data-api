from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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

app.include_router(health_router)
app.include_router(database_router)

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)
@app.middleware("http")
async def add_no_store_headers(request, call_next):
    response = await call_next(request)

    if (
        request.url.path.startswith("/api/database")
        or request.url.path.startswith("/health/db")
        or request.url.path.startswith("/health/summary")
    ):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    return response

@app.get("/")
def root():
    return FileResponse(FRONTEND_DIR / "index.html")