"""Nice Classification and USPTO coordinated-class utilities."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_DATA_DIR = Path(__file__).parent.parent / "data"


@lru_cache(maxsize=1)
def _load_coordinated() -> dict[int, list[int]]:
    with open(_DATA_DIR / "coordinated_classes.json") as f:
        raw = json.load(f)
    return {int(k): v for k, v in raw.items()}


@lru_cache(maxsize=1)
def _load_nice() -> dict[int, str]:
    with open(_DATA_DIR / "nice_classes.json") as f:
        raw = json.load(f)
    return {int(k): v for k, v in raw.items()}


def get_coordinated_classes(nice_class: int) -> list[int]:
    """Return all USPTO coordinated classes for the given Nice class (inclusive)."""
    graph = _load_coordinated()
    related = graph.get(nice_class, [])
    result = sorted({nice_class, *related})
    return result


def get_search_classes(nice_classes: list[int]) -> list[int]:
    """Expand a list of Nice classes to all USPTO coordinated classes."""
    all_classes: set[int] = set()
    for cls in nice_classes:
        all_classes.update(get_coordinated_classes(cls))
    return sorted(all_classes)


def class_heading(nice_class: int) -> str:
    return _load_nice().get(nice_class, f"Class {nice_class}")


def goods_services_relatedness(class_a: int, class_b: int) -> float:
    """Return a binary relatedness score: 1.0 if coordinated, 0.0 otherwise."""
    coordinated = get_coordinated_classes(class_a)
    return 1.0 if class_b in coordinated else 0.0
