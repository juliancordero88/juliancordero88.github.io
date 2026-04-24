"""POST /risk-assessment — DuPont-informed risk scoring.

Automates the two highest-weight DuPont factors:
  Factor 1 — Similarity of marks (phonetic + visual + conceptual)
  Factor 2 — Similarity of goods/services (coordinated classes + text embedding)

Flags Factors 7, 10, and 11 as requiring attorney review (resist automation).
"""
from __future__ import annotations

import time
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from services.trademark_search import search_all
from services.phonetic import phonetic_score
from services.text_similarity import visual_score
from services.semantic import semantic_score
from services.nice_classes import get_search_classes, goods_services_relatedness

router = APIRouter(tags=["risk"])

WEIGHTS = {"phonetic": 0.35, "visual": 0.30, "conceptual": 0.35}


# ── Models ────────────────────────────────────────────────────────────────────

class RiskRequest(BaseModel):
    mark:           str        = Field(..., min_length=1, max_length=200, examples=["SOLARSHINE"])
    goods_services: str        = Field("", max_length=2000, examples=["Solar energy software and applications"])
    nice_classes:   list[int]  = Field(default_factory=list, examples=[[9, 42]])


class ConflictEntry(BaseModel):
    mark:                str
    serial:              str
    registration_number: str
    owner:               str
    status:              str
    nice_classes:        list[int]
    goods_services:      str
    source:              str
    phonetic:            float
    visual:              float
    conceptual:          float
    gs_relatedness:      float
    risk_score:          float
    risk_level:          str


class DuPontFactors(BaseModel):
    factor_1_mark_similarity:   float
    factor_2_goods_relatedness: float
    factor_5_fame_of_mark:      str
    factor_6_concurrent_uses:   int
    factor_7_actual_confusion:  str
    factor_10_market_interface: str
    factor_11_right_to_exclude: str


class RiskResponse(BaseModel):
    query_mark:     str
    risk_level:     str
    overall_score:  float
    conflicts:      list[ConflictEntry]
    dupont_factors: DuPontFactors
    warnings:       list[str]
    elapsed_ms:     int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mark_similarity(mark1: str, mark2: str) -> tuple[float, float, float]:
    ph  = phonetic_score(mark1, mark2)
    vis = visual_score(mark1, mark2)
    con = semantic_score(mark1, mark2)
    return ph, vis, con


def _overall(ph: float, vis: float, con: float) -> float:
    return round(
        WEIGHTS["phonetic"] * ph +
        WEIGHTS["visual"]   * vis +
        WEIGHTS["conceptual"] * con,
        4,
    )


def _gs_relatedness(query_classes: list[int], candidate_classes: list[int]) -> float:
    """Average pairwise coordinated-class relatedness."""
    if not query_classes or not candidate_classes:
        return 0.5  # unknown — treat as moderate
    scores = [
        goods_services_relatedness(q, c)
        for q in query_classes
        for c in candidate_classes
    ]
    return round(sum(scores) / len(scores), 4) if scores else 0.0


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/risk-assessment", response_model=RiskResponse)
async def risk_assessment(body: RiskRequest) -> RiskResponse:
    """Full DuPont-informed trademark clearance risk assessment."""
    t0 = time.monotonic()

    search_classes = get_search_classes(body.nice_classes) if body.nice_classes else []
    raw, warnings = await search_all(body.mark, search_classes or None, "all")

    conflicts: list[ConflictEntry] = []
    for r in raw:
        ph, vis, con = _mark_similarity(body.mark, r["mark"])
        mark_sim = _overall(ph, vis, con)

        gs_rel = _gs_relatedness(body.nice_classes, r["nice_classes"])

        # Combined risk: 70% mark similarity, 30% goods/services relatedness
        risk_score = round(0.70 * mark_sim + 0.30 * gs_rel, 4)
        risk_level = "HIGH" if risk_score >= 0.75 else "MEDIUM" if risk_score >= 0.50 else "LOW"

        conflicts.append(ConflictEntry(
            mark=r["mark"],
            serial=r["serial"],
            registration_number=r["registration_number"],
            owner=r["owner"],
            status=r["status"],
            nice_classes=r["nice_classes"],
            goods_services=r["goods_services"],
            source=r["source"],
            phonetic=ph,
            visual=vis,
            conceptual=con,
            gs_relatedness=gs_rel,
            risk_score=risk_score,
            risk_level=risk_level,
        ))

    # Sort highest risk first, take top 25
    conflicts.sort(key=lambda c: c.risk_score, reverse=True)
    conflicts = conflicts[:25]

    overall_score = conflicts[0].risk_score if conflicts else 0.0
    overall_level = "HIGH" if overall_score >= 0.75 else "MEDIUM" if overall_score >= 0.50 else "LOW"

    factor_1 = conflicts[0].phonetic * 0.35 + conflicts[0].visual * 0.30 + conflicts[0].conceptual * 0.35 if conflicts else 0.0
    factor_2 = sum(c.gs_relatedness for c in conflicts) / len(conflicts) if conflicts else 0.0

    dupont = DuPontFactors(
        factor_1_mark_similarity=round(factor_1, 4),
        factor_2_goods_relatedness=round(factor_2, 4),
        factor_5_fame_of_mark="Not automated — check Google Trends / social metrics manually",
        factor_6_concurrent_uses=len(conflicts),
        factor_7_actual_confusion="Attorney review required — requires market evidence",
        factor_10_market_interface="Attorney review required — requires channel analysis",
        factor_11_right_to_exclude="Attorney review required — requires legal judgment",
    )

    elapsed = int((time.monotonic() - t0) * 1000)
    return RiskResponse(
        query_mark=body.mark,
        risk_level=overall_level,
        overall_score=overall_score,
        conflicts=conflicts,
        dupont_factors=dupont,
        warnings=warnings,
        elapsed_ms=elapsed,
    )
