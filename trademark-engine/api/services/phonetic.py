"""Phonetic similarity service.

Ensemble of four algorithms weighted by their false-positive characteristics:
  - Jaro-Winkler      → short/prefix-heavy marks, continuous 0-1
  - Double Metaphone  → general-purpose, foreign-origin marks
  - NYSIIS            → lower false-positive rate than Soundex
  - Beider-Morse      → multi-language portfolios, ~8% false-positive rate

Final score ∈ [0, 1].  Higher = more phonetically similar.
"""
from __future__ import annotations

import jellyfish


def _jaro_winkler(a: str, b: str) -> float:
    return jellyfish.jaro_winkler_similarity(a, b)


def _metaphone_match(a: str, b: str) -> float:
    """Double Metaphone — returns 1.0 if primary codes match, 0.5 if only
    secondary codes overlap, else 0.0."""
    try:
        from abydos.phonetic import DoubleMetaphone
        dm = DoubleMetaphone()
        codes_a = dm.encode(a)  # (primary, secondary)
        codes_b = dm.encode(b)
        if codes_a[0] and codes_b[0] and codes_a[0] == codes_b[0]:
            return 1.0
        if codes_a[1] and codes_b[1] and codes_a[1] == codes_b[1]:
            return 0.5
        return 0.0
    except Exception:
        # Fallback to jellyfish metaphone
        return 1.0 if jellyfish.metaphone(a) == jellyfish.metaphone(b) else 0.0


def _nysiis_match(a: str, b: str) -> float:
    try:
        return 1.0 if jellyfish.nysiis(a) == jellyfish.nysiis(b) else 0.0
    except Exception:
        return 0.0


def _beider_morse_match(a: str, b: str) -> float:
    try:
        from abydos.phonetic import BeiderMorse
        bm = BeiderMorse()
        codes_a = set(bm.encode(a).split("|"))
        codes_b = set(bm.encode(b).split("|"))
        if codes_a & codes_b:  # any overlap in the code set
            return 1.0
        return 0.0
    except Exception:
        return 0.0


def phonetic_score(mark1: str, mark2: str) -> float:
    """Return a phonetic similarity score in [0, 1]."""
    a, b = mark1.upper().strip(), mark2.upper().strip()
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0

    jw   = _jaro_winkler(a, b)
    meta = _metaphone_match(a, b)
    ny   = _nysiis_match(a, b)
    bm   = _beider_morse_match(a, b)

    # Weighted ensemble — Jaro-Winkler anchors continuous scoring;
    # the three binary checks boost marks that share phonetic codes.
    score = 0.40 * jw + 0.25 * meta + 0.15 * ny + 0.20 * bm
    return round(min(score, 1.0), 4)
