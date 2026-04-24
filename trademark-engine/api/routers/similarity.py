from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.phonetic import phonetic_score
from services.text_similarity import visual_score
from services.semantic import semantic_score

router = APIRouter(tags=["similarity"])

WEIGHTS = {"phonetic": 0.35, "visual": 0.30, "conceptual": 0.35}


class SimilarityRequest(BaseModel):
    mark1: str = Field(..., min_length=1, max_length=200, examples=["APPLE"])
    mark2: str = Field(..., min_length=1, max_length=200, examples=["APPEL"])


class SimilarityResponse(BaseModel):
    mark1:      str
    mark2:      str
    phonetic:   float
    visual:     float
    conceptual: float
    overall:    float
    level:      str  # HIGH | MEDIUM | LOW


@router.post("/similarity", response_model=SimilarityResponse)
async def compare_marks(body: SimilarityRequest) -> SimilarityResponse:
    """Compare two trademark names across phonetic, visual, and conceptual dimensions."""
    ph  = phonetic_score(body.mark1, body.mark2)
    vis = visual_score(body.mark1, body.mark2)
    con = semantic_score(body.mark1, body.mark2)

    overall = round(
        WEIGHTS["phonetic"] * ph +
        WEIGHTS["visual"]   * vis +
        WEIGHTS["conceptual"] * con,
        4,
    )
    level = "HIGH" if overall >= 0.75 else "MEDIUM" if overall >= 0.50 else "LOW"

    return SimilarityResponse(
        mark1=body.mark1,
        mark2=body.mark2,
        phonetic=ph,
        visual=vis,
        conceptual=con,
        overall=overall,
        level=level,
    )
