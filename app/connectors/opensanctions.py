"""OpenSanctions — международные санкции/PEP/adverse media.

Free public endpoint /match/default. Документация: https://www.opensanctions.org/api/
"""
import httpx

from app.connectors.base import ConnectorOutcome
from app.models import Candidate

USER_AGENT = "candidate-check/0.1 (+https://github.com/demedmir/candidate-check)"
STRONG_MATCH_THRESHOLD = 0.80
POSSIBLE_MATCH_THRESHOLD = 0.70


def _full_name(c: Candidate) -> str:
    parts = [c.last_name, c.first_name, c.middle_name or ""]
    return " ".join(p for p in parts if p).strip()


class OpenSanctionsConnector:
    key = "opensanctions"
    title = "OpenSanctions: санкции / PEP / adverse media"
    URL = "https://api.opensanctions.org/match/default"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        name = _full_name(candidate)
        if not name:
            return ConnectorOutcome(status="warning", summary="Имя не указано — пропуск")

        props: dict[str, list[str]] = {"name": [name]}
        if candidate.birth_date:
            props["birthDate"] = [candidate.birth_date.strftime("%Y-%m-%d")]

        body = {"queries": {"q": {"schema": "Person", "properties": props}}}
        async with httpx.AsyncClient(
            timeout=20.0, headers={"User-Agent": USER_AGENT, "Accept": "application/json"}
        ) as cli:
            r = await cli.post(self.URL, json=body)
            r.raise_for_status()
            data = r.json()

        results = data.get("responses", {}).get("q", {}).get("results", []) or []
        strong = [m for m in results if m.get("score", 0) >= STRONG_MATCH_THRESHOLD]
        possible = [
            m
            for m in results
            if POSSIBLE_MATCH_THRESHOLD <= m.get("score", 0) < STRONG_MATCH_THRESHOLD
        ]

        payload_matches = [
            {
                "id": m.get("id"),
                "score": m.get("score"),
                "caption": m.get("caption"),
                "datasets": m.get("datasets", []),
                "schema": m.get("schema"),
            }
            for m in results[:10]
        ]

        if strong:
            top = strong[0]
            return ConnectorOutcome(
                status="fail",
                summary=(
                    f"Сильное совпадение в санкционных списках: "
                    f"{top.get('caption')} (score={top.get('score'):.2f}, "
                    f"datasets={','.join(top.get('datasets', []))})"
                ),
                payload={"strong": len(strong), "possible": len(possible), "matches": payload_matches},
            )
        if possible:
            return ConnectorOutcome(
                status="warning",
                summary=f"Возможные совпадения ({len(possible)}) — требуется ручная проверка",
                payload={"strong": 0, "possible": len(possible), "matches": payload_matches},
            )
        return ConnectorOutcome(
            status="ok",
            summary="Совпадений в санкционных списках не найдено",
            payload={"strong": 0, "possible": 0, "matches": []},
        )
