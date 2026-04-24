"""GET /common-law — Check unregistered mark usage across three channels.

Sources:
  1. RDAP (free, no key)       — domain registration across .com/.net/.io/.co/.ai
  2. OpenCorporates (free API) — 200M+ company registrations in 170+ jurisdictions
  3. Social handles            — mocked list of popular TLDs; Checkmarks-style check

All calls run concurrently via asyncio.gather.
"""
from __future__ import annotations

import asyncio
from typing import Any

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Annotated

from config import get_settings

router  = APIRouter(tags=["common-law"])
settings = get_settings()
_TIMEOUT = httpx.Timeout(10.0)

_TLDS = [".com", ".net", ".io", ".co", ".ai", ".app", ".store", ".brand"]
_SOCIAL_PLATFORMS = ["twitter", "instagram", "facebook", "youtube", "tiktok", "linkedin"]


# ── Models ────────────────────────────────────────────────────────────────────

class DomainResult(BaseModel):
    domain:     str
    registered: bool
    registrant: str


class CompanyResult(BaseModel):
    name:         str
    jurisdiction: str
    status:       str
    company_number: str


class SocialResult(BaseModel):
    platform:  str
    handle:    str
    available: bool | None  # None = could not determine


class CommonLawResponse(BaseModel):
    query_mark: str
    domains:    list[DomainResult]
    companies:  list[CompanyResult]
    social:     list[SocialResult]
    warnings:   list[str]


# ── Domain check via RDAP ─────────────────────────────────────────────────────

async def _check_domain(client: httpx.AsyncClient, domain: str) -> DomainResult:
    url = f"https://rdap.org/domain/{domain}"
    try:
        resp = await client.get(url, follow_redirects=True)
        if resp.status_code == 200:
            data = resp.json()
            registrant = ""
            for entity in data.get("entities", []):
                for role in entity.get("roles", []):
                    if role == "registrant":
                        vcard = entity.get("vcardArray", [[], []])
                        for entry in vcard[1] if len(vcard) > 1 else []:
                            if entry[0] == "fn":
                                registrant = entry[3]
                                break
            return DomainResult(domain=domain, registered=True, registrant=registrant)
        # 404 = not found / available
        return DomainResult(domain=domain, registered=False, registrant="")
    except Exception:
        return DomainResult(domain=domain, registered=False, registrant="")


async def _check_domains(slug: str) -> list[DomainResult]:
    domains = [slug.lower().replace(" ", "") + tld for tld in _TLDS]
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        tasks = [_check_domain(client, d) for d in domains]
        return list(await asyncio.gather(*tasks))


# ── Company search via OpenCorporates ─────────────────────────────────────────

async def _search_companies(query: str) -> tuple[list[CompanyResult], str | None]:
    url = "https://api.opencorporates.com/v0.4/companies/search"
    params: dict[str, Any] = {"q": query, "per_page": 20}
    if settings.opencorporates_api_key:
        params["api_token"] = settings.opencorporates_api_key

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            return [], "OpenCorporates API key invalid or rate-limited"
        return [], f"OpenCorporates error {e.response.status_code}"
    except Exception as e:
        return [], f"OpenCorporates unavailable: {type(e).__name__}"

    results = []
    for item in data.get("results", {}).get("companies", []):
        co = item.get("company", {})
        results.append(CompanyResult(
            name=co.get("name", ""),
            jurisdiction=co.get("jurisdiction_code", ""),
            status=co.get("current_status", ""),
            company_number=co.get("company_number", ""),
        ))
    return results, None


# ── Social handle availability ────────────────────────────────────────────────

async def _check_social(handle: str) -> list[SocialResult]:
    """
    Best-effort availability check.  A proper implementation would use the
    Checkmarks API (checkmarks.com).  Without an API key we return None
    (unknown) for each platform rather than making unreliable scraping calls.
    """
    return [
        SocialResult(platform=p, handle=f"@{handle}", available=None)
        for p in _SOCIAL_PLATFORMS
    ]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/common-law", response_model=CommonLawResponse)
async def common_law_search(
    q: Annotated[str, Query(min_length=1, max_length=200, description="Mark name to check")],
) -> CommonLawResponse:
    """Check common-law trademark presence across domains, companies, and social handles."""
    slug = q.lower().replace(" ", "")

    domains_task   = _check_domains(slug)
    companies_task = _search_companies(q)
    social_task    = _check_social(slug)

    domains, (companies, co_warning), social = await asyncio.gather(
        domains_task, companies_task, social_task
    )

    warnings: list[str] = []
    if co_warning:
        warnings.append(co_warning)
    warnings.append(
        "Social handle availability requires Checkmarks API — showing handle slugs only"
    )

    return CommonLawResponse(
        query_mark=q,
        domains=domains,
        companies=companies,
        social=social,
        warnings=warnings,
    )
