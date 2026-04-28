"""Bootstrap: create an HR user.

Usage:
    python -m app.scripts.create_user <email> <password> [full_name]
"""
import asyncio
import sys

from app.auth import hash_password
from app.db import SessionLocal
from app.models import User


async def main(email: str, password: str, full_name: str = "") -> None:
    async with SessionLocal() as db:
        user = User(
            email=email.lower().strip(),
            full_name=full_name or email.split("@")[0],
            password_hash=hash_password(password),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"Created user id={user.id} email={user.email}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python -m app.scripts.create_user <email> <password> [full_name]")
        sys.exit(1)
    email, password = sys.argv[1], sys.argv[2]
    full_name = sys.argv[3] if len(sys.argv) > 3 else ""
    asyncio.run(main(email, password, full_name))
