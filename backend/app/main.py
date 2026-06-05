from fastapi import FastAPI
from app.api.routes.database_routes import router as database_router

app = FastAPI(
    title="DDP Business Data API",
    description="API local para consultar datos empresariales de forma controlada.",
    version="0.1.0"
)

app.include_router(database_router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "DDP Business Data API funcionando correctamente"
    }