from __future__ import annotations
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from config import get_settings
from routers import similarity, search, risk, common_law

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up the semantic model on startup if enabled
    if settings.enable_semantic:
        from services.semantic import get_model  # noqa: F401 — triggers download/cache
        get_model()
    yield


app = FastAPI(
    title="Trademark Clearance Engine",
    description=(
        "Programmatic trademark clearance: phonetic/visual/conceptual similarity "
        "scoring, USPTO + EUIPO database search, DuPont factor risk assessment, "
        "and common-law presence checking."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(similarity.router, prefix="/api/v1")
app.include_router(search.router,     prefix="/api/v1")
app.include_router(risk.router,       prefix="/api/v1")
app.include_router(common_law.router, prefix="/api/v1")


@app.get("/api/v1/health", tags=["meta"])
async def health():
    return {
        "status": "ok",
        "timestamp": int(time.time()),
        "semantic_enabled": settings.enable_semantic,
        "sources_configured": {
            "marker":          bool(settings.marker_api_key),
            "rapidapi":        bool(settings.rapidapi_key),
            "euipo":           bool(settings.euipo_client_id),
            "whoisxml":        bool(settings.whoisxml_api_key),
            "opencorporates":  bool(settings.opencorporates_api_key),
        },
    }
