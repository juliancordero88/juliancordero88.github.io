"""Conceptual / semantic similarity service.

Uses Sentence Transformers (all-MiniLM-L6-v2, 384-dim) to compute cosine
similarity between mark embeddings.  Catches conceptual equivalence that
phonetic/visual metrics miss — e.g. SUNBRIGHT vs SOLARSHINE.

The model is lazy-loaded on first call and cached.  If ENABLE_SEMANTIC=false,
falls back to a lightweight token-overlap score so the API still works on
low-RAM hosts without PyTorch.

Final score ∈ [0, 1].  Higher = more conceptually similar.
"""
from __future__ import annotations

import os
from functools import lru_cache

_MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(_MODEL_NAME)


def _token_overlap_score(a: str, b: str) -> float:
    """Lightweight fallback when sentence-transformers is disabled."""
    tokens_a = set(a.lower().split())
    tokens_b = set(b.lower().split())
    union = tokens_a | tokens_b
    if not union:
        return 1.0 if a == b else 0.0
    return len(tokens_a & tokens_b) / len(union)


def semantic_score(mark1: str, mark2: str) -> float:
    """Return a conceptual similarity score in [0, 1]."""
    a, b = mark1.strip(), mark2.strip()
    if not a or not b:
        return 0.0
    if a.lower() == b.lower():
        return 1.0

    if os.getenv("ENABLE_SEMANTIC", "true").lower() in ("false", "0", "no"):
        return round(_token_overlap_score(a, b), 4)

    try:
        import numpy as np
        model = get_model()
        emb_a, emb_b = model.encode([a, b], convert_to_numpy=True)
        cos = float(np.dot(emb_a, emb_b) / (np.linalg.norm(emb_a) * np.linalg.norm(emb_b)))
        return round(max(0.0, min(cos, 1.0)), 4)
    except Exception:
        return round(_token_overlap_score(a, b), 4)
