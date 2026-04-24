"""External trademark database integrations.

Sources (in priority order):
  1. Marker API    — markerapi.com, subscription, best JSON quality
  2. RapidAPI      — pentium10 USPTO Trademark, free tier 1k/mo
  3. EUIPO         — dev.euipo.europa.eu, free with registration

Each function returns a list of TrademarkRecord dicts.
All HTTP calls use httpx.AsyncClient with a 12-second timeout.
Sources degrade gracefully when their API key is not configured.
"""
from __future__ import annotations

import asyncio
from typing import Any

import httpx

from config import get_settings

settings = get_settings()

_TIMEOUT = httpx.Timeout(12.0)


# ── Data shape ────────────────────────────────────────────────────────────────

def _record(
    *,
    serial: str,
    mark: str,
    status: str,
    owner: str,
    nice_classes: list[int],
    goods_services: str,
    source: str,
    filing_date: str = "",
    registration_date: str = "",
    registration_number: str = "",
) -> dict[str, Any]:
    return dict(
        serial=serial,
        mark=mark,
        status=status,
        owner=owner,
        nice_classes=nice_classes,
        goods_services=goods_services,
        source=source,
        filing_date=filing_date,
        registration_date=registration_date,
        registration_number=registration_number,
    )


# ── Marker API ────────────────────────────────────────────────────────────────

async def _search_marker(query: str, page: int = 1) -> list[dict]:
    if not settings.marker_api_key:
        return []
    url = f"https://markerapi.com/api/v2/trademarks/trademark/{query}/status/all/start/{(page-1)*100}"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {settings.marker_api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    results = []
    for tm in data.get("trademarks", []):
        classes = []
        raw_cls = tm.get("intl_classes", tm.get("us_classes", ""))
        for part in str(raw_cls).split():
            try:
                classes.append(int(part))
            except ValueError:
                pass

        results.append(_record(
            serial=str(tm.get("serial_number", "")),
            mark=tm.get("trademark", ""),
            status=tm.get("status_code", ""),
            owner=tm.get("owner", ""),
            nice_classes=classes,
            goods_services=tm.get("goods_services", ""),
            source="marker",
            filing_date=tm.get("filing_date", ""),
            registration_date=tm.get("registration_date", ""),
            registration_number=str(tm.get("registration_number", "")),
        ))
    return results


# ── RapidAPI — pentium10 USPTO Trademark ──────────────────────────────────────

async def _search_rapidapi(query: str) -> list[dict]:
    if not settings.rapidapi_key:
        return []
    url = "https://uspto-trademark.p.rapidapi.com/v1/trademarkSearch"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                url,
                params={"query": query, "searchType": "active"},
                headers={
                    "X-RapidAPI-Key":  settings.rapidapi_key,
                    "X-RapidAPI-Host": "uspto-trademark.p.rapidapi.com",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    results = []
    for item in data.get("items", []):
        classes = []
        for cls_obj in item.get("international_codes", []):
            try:
                classes.append(int(cls_obj.get("code", 0)))
            except (ValueError, TypeError):
                pass

        results.append(_record(
            serial=str(item.get("serial_number", "")),
            mark=item.get("keyword", ""),
            status=item.get("status_label", ""),
            owner=item.get("owners", [{}])[0].get("name", "") if item.get("owners") else "",
            nice_classes=classes,
            goods_services=item.get("description", ""),
            source="rapidapi",
            filing_date=item.get("filing_date", ""),
            registration_date=item.get("registration_date", ""),
            registration_number=str(item.get("registration_number", "")),
        ))
    return results


# ── EUIPO Trademark Search API ────────────────────────────────────────────────

async def _search_euipo(query: str, nice_classes: list[int] | None = None) -> list[dict]:
    """Search the EUIPO trademark database — free with registration."""
    url = "https://trademark.euipo.europa.eu/api/v1/trademarks"
    params: dict[str, Any] = {
        "tmName": query,
        "tmNameKind": "CONTAINS",
        "pageSize": 50,
        "page": 1,
    }
    if nice_classes:
        params["niceClasses"] = ",".join(str(c) for c in nice_classes)

    headers: dict[str, str] = {"Accept": "application/json"}
    if settings.euipo_client_id:
        headers["X-IBM-Client-Id"] = settings.euipo_client_id
    if settings.euipo_client_secret:
        headers["X-IBM-Client-Secret"] = settings.euipo_client_secret

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    results = []
    for tm in data.get("trademarks", data.get("data", [])):
        classes_raw = tm.get("niceClasses", tm.get("goodsAndServicesClasses", []))
        classes = []
        for c in classes_raw:
            try:
                classes.append(int(c) if isinstance(c, (int, str)) else int(c.get("classNumber", 0)))
            except (ValueError, TypeError):
                pass

        results.append(_record(
            serial=str(tm.get("applicationNumber", "")),
            mark=tm.get("markFeature", {}).get("wordingElement", tm.get("trademark", query)),
            status=tm.get("trademarkStatus", {}).get("code", ""),
            owner=tm.get("applicants", [{}])[0].get("name", "") if tm.get("applicants") else "",
            nice_classes=classes,
            goods_services=tm.get("goodsAndServices", ""),
            source="euipo",
            filing_date=tm.get("filingDate", ""),
            registration_date=tm.get("registrationDate", ""),
            registration_number=str(tm.get("registrationNumber", "")),
        ))
    return results


# ── Aggregate search ──────────────────────────────────────────────────────────

async def search_all(
    query: str,
    nice_classes: list[int] | None = None,
    source: str = "all",
) -> tuple[list[dict], list[str]]:
    """Fan out to configured sources, deduplicate, return (results, warnings)."""
    tasks = []
    if source in ("all", "marker"):
        tasks.append(_search_marker(query))
    if source in ("all", "rapidapi"):
        tasks.append(_search_rapidapi(query))
    if source in ("all", "euipo"):
        tasks.append(_search_euipo(query, nice_classes))

    batches = await asyncio.gather(*tasks, return_exceptions=True)

    seen_serials: set[str] = set()
    merged: list[dict] = []
    for batch in batches:
        if isinstance(batch, Exception):
            continue
        for record in batch:
            key = record["serial"] or record["mark"]
            if key not in seen_serials:
                seen_serials.add(key)
                merged.append(record)

    warnings: list[str] = []
    if not settings.marker_api_key and source in ("all", "marker"):
        warnings.append("MARKER_API_KEY not set — USPTO (Marker) results skipped")
    if not settings.rapidapi_key and source in ("all", "rapidapi"):
        warnings.append("RAPIDAPI_KEY not set — USPTO (RapidAPI) results skipped")

    return merged, warnings
