"""Сменить пароль существующего HR-пользователя.

Usage:
    python -m app.scripts.set_password <email> <new_password>
"""
import asyncio
import sys

from sqlalchemy import select

from app.auth import hash_password
from app.db import SessionLocal
from app.models import User


async def main(email: str, new_password: str) -> None:
    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.email == email.lower().strip()))
        user = res.scalar_one_or_none()
        if not user:
            print(f"User not found: {email}")
            sys.exit(1)
        user.password_hash = hash_password(new_password)
        await db.commit()
        print(f"Password updated for id={user.id} email={user.email}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m app.scripts.set_password <email> <new_password>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1], sys.argv[2]))
