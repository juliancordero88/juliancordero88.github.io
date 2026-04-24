from __future__ import annotations

import time
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel

from services.trademark_search import search_all
from services.phonetic import phonetic_score
from services.text_similarity import visual_score
from services.nice_classes import get_search_classes

router = APIRouter(tags=["search"])


class TrademarkResult(BaseModel):
    serial:              str
    mark:                str
    status:              str
    owner:               str
    nice_classes:        list[int]
    goods_services:      str
    source:              str
    filing_date:         str
    registration_date:   str
    registration_number: str
    phonetic_score:      float
    visual_score:        float


class SearchResponse(BaseModel):
    query_mark:   str
    total:        int
    elapsed_ms:   int
    warnings:     list[str]
    results:      list[TrademarkResult]


@router.get("/search", response_model=SearchResponse)
async def trademark_search(
    q:       Annotated[str, Query(min_length=1, max_length=200, description="Trademark name to search")],
    classes: Annotated[str | None, Query(description="Comma-separated Nice class numbers, e.g. 9,42")] = None,
    limit:   Annotated[int, Query(ge=1, le=200)] = 50,
    source:  Annotated[str, Query(description="all | marker | rapidapi | euipo")] = "all",
) -> SearchResponse:
    """Search trademark databases for potentially conflicting marks."""
    t0 = time.monotonic()

    nice_classes: list[int] = []
    if classes:
        for part in classes.split(","):
            try:
                nice_classes.append(int(part.strip()))
            except ValueError:
                pass

    search_classes = get_search_classes(nice_classes) if nice_classes else []

    raw_results, warnings = await search_all(q, search_classes or None, source)

    # Filter by coordinated classes when provided
    if search_classes:
        filtered = [
            r for r in raw_results
            if not r["nice_classes"] or bool(set(r["nice_classes"]) & set(search_classes))
        ]
    else:
        filtered = raw_results

    # Score each result
    scored: list[TrademarkResult] = []
    for r in filtered[:limit]:
        ph  = phonetic_score(q, r["mark"])
        vis = visual_score(q, r["mark"])
        scored.append(TrademarkResult(
            serial=r["serial"],
            mark=r["mark"],
            status=r["status"],
            owner=r["owner"],
            nice_classes=r["nice_classes"],
            goods_services=r["goods_services"],
            source=r["source"],
            filing_date=r["filing_date"],
            registration_date=r["registration_date"],
            registration_number=r["registration_number"],
            phonetic_score=ph,
            visual_score=vis,
        ))

    # Sort by combined phonetic + visual score descending
    scored.sort(key=lambda r: r.phonetic_score + r.visual_score, reverse=True)

    elapsed = int((time.monotonic() - t0) * 1000)
    return SearchResponse(
        query_mark=q,
        total=len(scored),
        elapsed_ms=elapsed,
        warnings=warnings,
        results=scored,
    )
