"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "candidates",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("last_name", sa.String(120), nullable=False),
        sa.Column("first_name", sa.String(120), nullable=False),
        sa.Column("middle_name", sa.String(120)),
        sa.Column("birth_date", sa.DateTime(timezone=False)),
        sa.Column("inn", sa.String(12)),
        sa.Column("snils", sa.String(14)),
        sa.Column("passport", sa.String(20)),
        sa.Column("phone", sa.String(20)),
        sa.Column("email", sa.String(255)),
        sa.Column("consent_signed_offline", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("consent_file_path", sa.String(500)),
        sa.Column("consent_signed_at", sa.DateTime(timezone=True)),
        sa.Column("created_by_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_candidates_inn", "candidates", ["inn"])

    check_status = sa.Enum("pending", "running", "completed", "failed", name="checkstatus")
    check_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "check_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("candidate_id", sa.Integer, sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", check_status, nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("requested_by_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_check_runs_candidate_id", "check_runs", ["candidate_id"])
    op.create_index("ix_check_runs_status", "check_runs", ["status"])

    result_status = sa.Enum("ok", "warning", "fail", "error", name="resultstatus")
    result_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "check_results",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("run_id", sa.Integer, sa.ForeignKey("check_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("status", result_status, nullable=False),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("payload", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("error", sa.Text),
        sa.Column("duration_ms", sa.Integer),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_check_results_run_id", "check_results", ["run_id"])
    op.create_index("ix_check_results_source", "check_results", ["source"])


def downgrade() -> None:
    op.drop_table("check_results")
    op.drop_table("check_runs")
    op.drop_table("candidates")
    op.drop_table("users")
    sa.Enum(name="resultstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="checkstatus").drop(op.get_bind(), checkfirst=True)
