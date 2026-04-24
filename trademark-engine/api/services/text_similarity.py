"""Visual / string similarity service.

Four complementary metrics weighted by their sensitivity to trademark perception:
  - Jaro-Winkler (0.40)  → overall character similarity, prefix bias
  - Levenshtein norm (0.30) → edit distance, catches single-char changes
  - Bigram Jaccard (0.20) → shared character sequences
  - Token-sort ratio (0.10) → handles word-order variants (BLUE STAR vs STAR BLUE)

Final score ∈ [0, 1].  Higher = more visually similar.
"""
from __future__ import annotations

import jellyfish
from rapidfuzz import fuzz


def _bigram_jaccard(a: str, b: str) -> float:
    def bigrams(s: str) -> set[str]:
        return {s[i : i + 2] for i in range(len(s) - 1)}

    bg_a, bg_b = bigrams(a), bigrams(b)
    union = bg_a | bg_b
    if not union:
        return 1.0 if a == b else 0.0
    return len(bg_a & bg_b) / len(union)


def visual_score(mark1: str, mark2: str) -> float:
    """Return a visual/string similarity score in [0, 1]."""
    a, b = mark1.upper().strip(), mark2.upper().strip()
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0

    jw      = jellyfish.jaro_winkler_similarity(a, b)
    lev     = jellyfish.levenshtein_distance(a, b)
    lev_n   = 1.0 - lev / max(len(a), len(b))
    jaccard = _bigram_jaccard(a, b)
    token   = fuzz.token_sort_ratio(a, b) / 100.0

    score = 0.40 * jw + 0.30 * lev_n + 0.20 * jaccard + 0.10 * token
    return round(min(score, 1.0), 4)
