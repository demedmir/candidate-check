"""Клиент к passport-ocr микросервису (Spark via Tailscale)."""
import httpx

from app.config import settings


class PassportOcrError(Exception):
    pass


async def recognize_passport(image_bytes: bytes, *, timeout: float = 30.0) -> dict:
    """Распознать паспорт через Spark OCR-сервис.

    Возвращает dict с ключами: fields, lines, elapsed_ms.
    Бросает PassportOcrError если сервис не настроен или вернул ошибку.
    """
    if not settings.passport_ocr_url:
        raise PassportOcrError("passport_ocr_url not configured")

    headers: dict[str, str] = {}
    if settings.passport_ocr_token:
        headers["Authorization"] = f"Bearer {settings.passport_ocr_token}"

    url = settings.passport_ocr_url.rstrip("/") + "/ocr/passport"
    async with httpx.AsyncClient(timeout=timeout, headers=headers) as cli:
        files = {"image": ("passport.jpg", image_bytes, "image/jpeg")}
        r = await cli.post(url, files=files)
        if r.status_code != 200:
            raise PassportOcrError(f"OCR HTTP {r.status_code}: {r.text[:200]}")
        return r.json()


async def is_available() -> bool:
    if not settings.passport_ocr_url:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as cli:
            r = await cli.get(settings.passport_ocr_url.rstrip("/") + "/healthz")
            return r.status_code == 200 and r.json().get("engine_ready", False)
    except Exception:  # noqa: BLE001
        return False
