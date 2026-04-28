from dataclasses import dataclass, field
from typing import Any, Protocol

from app.models import Candidate


@dataclass
class ConnectorOutcome:
    status: str  # "ok" | "warning" | "fail" | "error"
    summary: str
    payload: dict[str, Any] = field(default_factory=dict)


class SourceConnector(Protocol):
    key: str
    title: str

    async def run(self, candidate: Candidate) -> ConnectorOutcome: ...
