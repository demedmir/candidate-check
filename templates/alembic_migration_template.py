"""TEMPLATE: миграция Alembic.

ШАГИ:
1. Скопируй в `alembic/versions/000N_<имя>.py`. N — следующий по порядку номер.
2. Найди предыдущую миграцию (head) и подставь её ID в `down_revision`.
3. Реализуй upgrade() и downgrade().
4. Применить локально:  `docker compose run --rm app alembic upgrade head`
5. На VPS:  `ssh <vps> "cd /opt/candidate-check && sudo docker compose run --rm app alembic upgrade head"`

ПРАВИЛА:
- НЕ редактируй уже применённые миграции — создавай новые.
- ENUM-типы создавай через `sa.Enum(...)` в Column — SA сам сделает CREATE TYPE.
- Тяжёлые миграции (ALTER большой таблицы) — обсудить с человеком.
- ENUM для PostgreSQL — `Enum(..., name="my_enum")`. Уникальные имена!
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# TODO: уникальный ID этой миграции (например "0004_add_candidate_tags")
revision: str = "000N_TODO"
# TODO: ID предыдущей миграции (см. последний файл в alembic/versions/)
down_revision: Union[str, None] = "0003_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # TODO: пример — добавить колонку
    # op.add_column("candidates", sa.Column("tags", sa.JSON, nullable=True))
    pass


def downgrade() -> None:
    # TODO: всё, что сделал upgrade — обратно
    # op.drop_column("candidates", "tags")
    pass
