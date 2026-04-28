from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.config import settings


async def save_consent_file(upload: UploadFile) -> str:
    Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)
    ext = Path(upload.filename or "consent.bin").suffix.lower() or ".bin"
    name = f"consent_{uuid4().hex}{ext}"
    full = Path(settings.storage_dir) / name
    with full.open("wb") as f:
        while chunk := await upload.read(1024 * 1024):
            f.write(chunk)
    return str(full)
