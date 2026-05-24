import json
from pathlib import Path
from typing import Dict, List

# Централизованный доступ к данным олимпиад
BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "normalized.json"


def _load_normalized() -> List[Dict]:
    if not DATA_PATH.exists():
        return []
    try:
        with open(DATA_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _build_subject_tags(olympiads: List[Dict]) -> Dict[str, List[str]]:
    tags = {}
    for o in olympiads:
        for subj in o.get("subjects", []):
            if subj not in tags:
                tags[subj] = set()
            for t in o.get("tags", []):
                tags[subj].add(t)
    # convert sets to sorted lists
    return {k: sorted(list(v)) for k, v in tags.items()}


# Значения уровня подготовки, используемые в recommender
PREPARATION_LEVELS = {
    "начальный": 0.3,
    "средний": 0.6,
    "продвинутый": 1.0,
}


# Модульные переменные (инициализация при импорте)
OLYMPIADS = _load_normalized()
SUBJECT_TAGS = _build_subject_tags(OLYMPIADS)


def reload() -> int:
    """Перечитать `normalized.json` и обновить вспомогательные структуры.

    Возвращает число записей.
    """
    global OLYMPIADS, SUBJECT_TAGS
    OLYMPIADS = _load_normalized()

    # Простая эвристика: если у записи не указаны предметы, попытаемся извлечь их из названия
    # и описания по ключевым словам. Это помогает при отсутствии детального парсинга страниц.
    SUBJECT_KEYWORDS = {
        "матем": "математика",
        "физ": "физика",
        "информ": "информатика",
        "программ": "информатика",
        "хим": "химия",
        "биол": "биология",
        "истор": "история",
        "литер": "литература",
        "англ": "английский язык",
        "эконом": "экономика",
        "географ": "география",
        "лингв": "лингвистика",
        "правосл": "основы православной культуры",
    }

    for o in OLYMPIADS:
        name = (o.get("name") or "").lower()
        desc = (o.get("description") or "").lower()
        subjects = set(o.get("subjects") or [])
        for k, subj in SUBJECT_KEYWORDS.items():
            if k in name or k in desc:
                subjects.add(subj)
        if subjects:
            o["subjects"] = sorted(list(subjects))

    SUBJECT_TAGS = _build_subject_tags(OLYMPIADS)
    return len(OLYMPIADS)


def save_as_module(target: Path):
    """Сохранить текущие данные как питоновский модуль (удобно для статического импорта).

    Не используется автоматически, но доступно как утилита.
    """
    content = f"# Auto-generated olympiad data module\nOLYMPIADS = {json.dumps(OLYMPIADS, ensure_ascii=False, indent=2)}\n"
    target.write_text(content, encoding="utf-8")
