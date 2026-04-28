"""Rule-engine для светофора.

Загружает config/adjudication.yaml, считает risk_score и сегмент
(green/yellow/red) на основании весов и статусов CheckResult'ов.
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import yaml

from app.models import CheckResult

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "adjudication.yaml"


@dataclass(frozen=True)
class AdjudicationOutcome:
    score: int
    segment: str  # "green" | "yellow" | "red"
    breakdown: list[dict]  # [{source, status, weight}]


class Adjudicator:
    def __init__(self, segment: str = "default", path: Path = CONFIG_PATH) -> None:
        config = yaml.safe_load(path.read_text(encoding="utf-8"))
        segments = config.get("segments", {})
        if segment not in segments:
            segment = "default"
        seg = segments[segment]
        self.segment_name = segment
        self.thresholds = seg.get("thresholds", {})
        self.weights: dict[str, dict[str, int]] = seg.get("weights", {})

    def _weight(self, source: str, status: str) -> int:
        return int(self.weights.get(source, {}).get(status, 0))

    def evaluate(self, results: Iterable[CheckResult]) -> AdjudicationOutcome:
        breakdown: list[dict] = []
        score = 0
        for r in results:
            w = self._weight(r.source, r.status.value)
            score += w
            breakdown.append({"source": r.source, "status": r.status.value, "weight": w})

        green_max = int(self.thresholds.get("green_max", 29))
        yellow_max = int(self.thresholds.get("yellow_max", 69))

        if score <= green_max:
            seg = "green"
        elif score <= yellow_max:
            seg = "yellow"
        else:
            seg = "red"

        return AdjudicationOutcome(score=score, segment=seg, breakdown=breakdown)
