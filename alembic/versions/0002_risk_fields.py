"""add risk_score and risk_segment to check_runs + role_segment to candidates

Revision ID: 0002_risk_fields
Revises: 0001_initial
Create Date: 2026-04-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_risk_fields"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "check_runs",
        sa.Column("risk_score", sa.Integer, nullable=True),
    )
    op.add_column(
        "check_runs",
        sa.Column("risk_segment", sa.String(16), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column("role_segment", sa.String(32), nullable=False, server_default="default"),
    )


def downgrade() -> None:
    op.drop_column("candidates", "role_segment")
    op.drop_column("check_runs", "risk_segment")
    op.drop_column("check_runs", "risk_score")
