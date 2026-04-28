"""Captcha-solver: микросервис для распознавания простых text-image капч.

Endpoint: POST /solve  body: image (multipart) или {"image_b64": "..."}
Returns: {"text": "abc123", "confidence": 0.95, "elapsed_ms": 12}

Использует ddddocr — OCR-движок специально под капчу (https://github.com/sml2h3/ddddocr).
Легкий ONNX-runtime, без GPU. Точность на простых символьных капчах ~80-90%.
"""
import base64
import os
import time
from contextlib import asynccontextmanager
from typing import Annotated

import ddddocr
import structlog
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel

log = structlog.get_logger()

API_TOKEN = os.environ.get("CAPTCHA_API_TOKEN", "")

# Отдельная инстанция OCR (тяжёлая инициализация — держим singleton)
_ocr: ddddocr.DdddOcr | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _ocr
    log.info("loading ddddocr model…")
    _ocr = ddddocr.DdddOcr(show_ad=False, beta=False)
    log.info("ddddocr ready")
    yield


app = FastAPI(title="captcha-solver", version="0.1.0", lifespan=lifespan)


def _check_token(authorization: Annotated[str | None, Header()] = None):
    if not API_TOKEN:
        return  # auth disabled
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing bearer token")
    if authorization.removeprefix("Bearer ").strip() != API_TOKEN:
        raise HTTPException(401, "bad token")


class SolveResponse(BaseModel):
    text: str
    elapsed_ms: int
    engine: str = "ddddocr"


class SolveBase64Request(BaseModel):
    image_b64: str


@app.get("/healthz")
async def healthz():
    return {"ok": True, "engine_ready": _ocr is not None}


@app.post("/solve", response_model=SolveResponse, dependencies=[Depends(_check_token)])
async def solve_multipart(image: UploadFile = File(...)):
    raw = await image.read()
    return _solve(raw)


@app.post(
    "/solve_b64",
    response_model=SolveResponse,
    dependencies=[Depends(_check_token)],
)
async def solve_b64(req: SolveBase64Request):
    try:
        raw = base64.b64decode(req.image_b64)
    except Exception as e:
        raise HTTPException(400, f"bad base64: {e}")
    return _solve(raw)


def _solve(raw: bytes) -> SolveResponse:
    if _ocr is None:
        raise HTTPException(503, "engine not ready")
    if not raw:
        raise HTTPException(400, "empty image")
    t0 = time.perf_counter()
    text = _ocr.classification(raw)
    elapsed = int((time.perf_counter() - t0) * 1000)
    log.info("solved", chars=len(text), ms=elapsed)
    return SolveResponse(text=text, elapsed_ms=elapsed)
