from fastapi import Cookie, Depends, HTTPException
from itsdangerous import BadSignature, TimestampSigner
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session
from app.models import User

pwd = CryptContext(schemes=["argon2"], deprecated="auto")
signer = TimestampSigner(settings.app_secret)

SESSION_COOKIE = "ccsession"


def hash_password(plain: str) -> str:
    return pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd.verify(plain, hashed)


def make_session(user_id: int) -> str:
    return signer.sign(str(user_id).encode()).decode()


def parse_session(token: str) -> int | None:
    try:
        raw = signer.unsign(token, max_age=settings.hr_session_ttl_seconds)
        return int(raw)
    except (BadSignature, ValueError):
        return None


async def current_user(
    ccsession: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_session),
) -> User:
    if not ccsession:
        raise HTTPException(401, "Не авторизован")
    user_id = parse_session(ccsession)
    if user_id is None:
        raise HTTPException(401, "Сессия невалидна")
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Пользователь не найден или отключён")
    return user
