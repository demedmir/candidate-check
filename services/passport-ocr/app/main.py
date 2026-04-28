"""Passport-OCR: распознавание паспорта РФ через EasyOCR.

POST /ocr/passport (multipart "image") →
  {"fields": {last_name, first_name, ..., birth_date, ...}, "lines": [...], "elapsed_ms": ...}

EasyOCR с языками ru+en. Первый запуск загружает веса (~100 MB) в /root/.EasyOCR.
"""
import io
import os
import time
from contextlib import asynccontextmanager
from typing import Annotated

import easyocr
import numpy as np
import structlog
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel

from app.parser import parse as parse_passport

log = structlog.get_logger()

API_TOKEN = os.environ.get("OCR_API_TOKEN", "")

_reader: easyocr.Reader | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _reader
    log.info("loading easyocr (ru+en)…")
    # gpu=False — EasyOCR попытается detect автоматом; на Spark с GB10 будет CUDA
    _reader = easyocr.Reader(["ru", "en"], gpu=True, verbose=False)
    log.info("easyocr ready")
    yield


app = FastAPI(title="passport-ocr", version="0.1.0", lifespan=lifespan)


def _check_token(authorization: Annotated[str | None, Header()] = None):
    if not API_TOKEN:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing bearer token")
    if authorization.removeprefix("Bearer ").strip() != API_TOKEN:
        raise HTTPException(401, "bad token")


class PassportResponse(BaseModel):
    fields: dict
    lines: list[str]
    elapsed_ms: int


@app.get("/healthz")
async def healthz():
    return {"ok": True, "engine_ready": _reader is not None}


@app.post(
    "/ocr/passport",
    response_model=PassportResponse,
    dependencies=[Depends(_check_token)],
)
async def ocr_passport(image: UploadFile = File(...)):
    if _reader is None:
        raise HTTPException(503, "engine not ready")
    raw = await image.read()
    if not raw:
        raise HTTPException(400, "empty image")

    try:
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")
        # Resize если больше 2000px по длинной стороне — для скорости
        max_side = max(img.size)
        if max_side > 2000:
            scale = 2000 / max_side
            img = img.resize((int(img.size[0] * scale), int(img.size[1] * scale)))
        np_img = np.array(img)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, f"bad image: {e}")

    t0 = time.perf_counter()
    # readtext: list[(bbox, text, confidence)]
    raw_results = _reader.readtext(np_img, paragraph=False, detail=1)
    elapsed = int((time.perf_counter() - t0) * 1000)

    lines: list[str] = []
    for bbox, text, _conf in raw_results:
        text = (text or "").strip()
        if text:
            lines.append(text)

    fields = parse_passport(lines)
    log.info("passport_ocr_done", lines=len(lines), ms=elapsed)
    return PassportResponse(fields=fields, lines=lines, elapsed_ms=elapsed)
