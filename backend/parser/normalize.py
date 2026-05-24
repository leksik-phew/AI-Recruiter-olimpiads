import re


def generate_id(name: str, url: str = None) -> str:
    """Генерирует уникальный id для записи.

    Сначала пытаемся извлечь числовой идентификатор из URL `/activity/<id>`.
    Если не удалось — создаём безопасный slug из названия (латиница/цифры/черточки),
    а при пустом результате используем хеш.
    """
    # попробовать взять id из URL
    if url:
        m = re.search(r"/activity/(\d+)", url)
        if m:
            return f"activity_{m.group(1)}"

    # fallback: безопасный slug
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower())
    slug = slug.strip("-")
    if slug:
        return slug

    # окончательный fallback — хеш
    return f"id_{abs(hash(name))}"


def normalize(raw_items):
    normalized = []

    for item in raw_items:
        url = item.get("url")
        base_id = generate_id(item.get("name", ""), url=url)
        uid = base_id
        # убедимся в уникальности id
        suffix = 1
        while uid in {n["id"] for n in normalized}:
            suffix += 1
            uid = f"{base_id}_{suffix}"

        entry = {
            "id": uid,
            "name": item["name"],
            "short_name": item["name"],
            "organizer": None,
            "subjects": [],
            "tags": [],
            "grades": [],
            "level": None,
            "type": "олимпиада",
            "stages": [],
            "difficulty": None,
            "preparation_time_months": None,
            "regions": ["all"],
            "online": None,
            "prize": None,
            "url": item["url"],
            "description": None,
            "collaboration_score": 0.5,
        }

        # merge detail if available (fetch_detail adds 'detail' into raw item)
        detail = item.get("detail") or {}
        if detail:
            if detail.get("organizer"):
                entry["organizer"] = detail.get("organizer")
            if detail.get("subjects"):
                entry["subjects"] = detail.get("subjects")
            if detail.get("tags"):
                entry["tags"] = detail.get("tags")
            if detail.get("grades"):
                entry["grades"] = detail.get("grades")
            if detail.get("level"):
                entry["level"] = detail.get("level")
            if detail.get("stages"):
                entry["stages"] = detail.get("stages")
            if detail.get("difficulty"):
                entry["difficulty"] = detail.get("difficulty")
            if "online" in detail and detail.get("online") is not None:
                entry["online"] = detail.get("online")
            if detail.get("prize"):
                entry["prize"] = detail.get("prize")
            if detail.get("description"):
                entry["description"] = detail.get("description")

        normalized.append(entry)

    return normalized