import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# CORS для dev: vite dev server (localhost:5173) ходит на FastAPI напрямую
# Прод: фронт раздаётся nginx с того же домена → same-origin, CORS не нужен,
# но allow_origins ниже — для удобной разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(hr_router, prefix="/hr")  # legacy HTMX, выпилим после React migration
app.include_router(api_router, prefix="/api")


@app.get("/healthz")
async def healthz():
    return {"ok": True}
