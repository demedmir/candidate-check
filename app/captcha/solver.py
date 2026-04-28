"""Клиент к captcha-solver микросервису (Spark via Tailscale)."""
import httpx

from app.config import settings


class CaptchaSolverError(Exception):
    pass


async def solve_image(image_bytes: bytes, *, timeout: float = 10.0) -> str:
    """Отправить капчу-картинку в solver и получить распознанный текст.

    Бросает CaptchaSolverError если solver не настроен или вернул ошибку.
    """
    if not settings.captcha_solver_url:
        raise CaptchaSolverError("captcha_solver_url not configured")

    headers: dict[str, str] = {}
    if settings.captcha_solver_token:
        headers["Authorization"] = f"Bearer {settings.captcha_solver_token}"

    url = settings.captcha_solver_url.rstrip("/") + "/solve"
    async with httpx.AsyncClient(timeout=timeout, headers=headers) as cli:
        files = {"image": ("captcha.png", image_bytes, "image/png")}
        r = await cli.post(url, files=files)
        if r.status_code != 200:
            raise CaptchaSolverError(f"solver HTTP {r.status_code}: {r.text[:200]}")
        data = r.json()
    text = (data.get("text") or "").strip()
    if not text:
        raise CaptchaSolverError("solver returned empty text")
    return text


async def is_available() -> bool:
    if not settings.captcha_solver_url:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as cli:
            r = await cli.get(settings.captcha_solver_url.rstrip("/") + "/healthz")
            return r.status_code == 200 and r.json().get("engine_ready", False)
    except Exception:  # noqa: BLE001
        return False
