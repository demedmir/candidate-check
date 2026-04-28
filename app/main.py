import structlog
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routes_api import router as api_router
from app.routes_hr import router as hr_router

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)

app = FastAPI(title="candidate-check", version="0.1.0")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(hr_router, prefix="/hr")
app.include_router(api_router, prefix="/api")


@app.get("/healthz")
async def healthz():
    return {"ok": True}
