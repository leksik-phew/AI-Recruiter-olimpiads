"""Централизованный доступ к данным олимпиад.

Единственный источник данных — backend/data/normalized.json.
Модуль не добавляет и не изменяет данные: только загружает и строит
вспомогательный индекс тегов для рекомендателя.
"""

import json
from pathlib import Path
from typing import Dict, List

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "normalized.json"

# Числовые веса уровней подготовки — используются в recommender.py
PREPARATION_LEVELS: Dict[str, float] = {
    "начальный":   0.3,
    "средний":     0.6,
    "продвинутый": 1.0,
}


def _load() -> List[Dict]:
    """Читает normalized.json и возвращает список олимпиад as-is."""
    if not DATA_PATH.exists():
        return []
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _build_subject_tags(olympiads: List[Dict]) -> Dict[str, List[str]]:
    """Строит индекс subject → [теги] для tag-based скоринга."""
    index: Dict[str, set] = {}
    for o in olympiads:
        for subj in (o.get("subjects") or []):
            index.setdefault(subj, set()).update(o.get("tags") or [])
    return {k: sorted(v) for k, v in index.items()}


def reload() -> int:
    """Перечитать normalized.json. Возвращает число загруженных записей."""
    global OLYMPIADS, SUBJECT_TAGS
    OLYMPIADS = _load()
    SUBJECT_TAGS = _build_subject_tags(OLYMPIADS)
    return len(OLYMPIADS)


# ─── Инициализация при импорте ────────────────────────────────────────────────
OLYMPIADS: List[Dict] = []
SUBJECT_TAGS: Dict[str, List[str]] = {}
reload()
