"""
Скрипт обновления базы олимпиад.

Источники данных:
  1. olimpiada.ru     — основной, содержит большинство олимпиад РСОШ
  2. rsr-olymp.ru     — официальный сайт РСОШ (Российского совета олимпиад школьников)
  3. Минпросвещения   — ВсОШ и другие официальные источники
  4. Региональные     — региональные порталы олимпиад

Запуск:
    cd backend && python update_data.py [--sources olimpiada|rsosh|minpros|all]

По умолчанию: all (все источники).
"""

import argparse
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

def _load_normalized() -> list[dict]:
    p = DATA_DIR / "normalized.json"
    if p.exists():
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    return []

def _save_normalized(data: list[dict]):
    with open(DATA_DIR / "normalized.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def _deduplicate(items: list[dict]) -> list[dict]:
    """Удаляет дубликаты по URL (последний источник побеждает по данным)."""
    seen_urls: dict[str, dict] = {}
    seen_ids: dict[str, int] = {}

    for item in items:
        url = item.get("url", "")
        uid = item.get("id", "")
        if url and url in seen_urls:

            existing = seen_urls[url]
            for k, v in item.items():
                if v and not existing.get(k):
                    existing[k] = v
        else:
            seen_urls[url] = item

    return list(seen_urls.values())

def fetch_from_olimpiada() -> list[dict]:
    """Загружает и нормализует данные с olimpiada.ru."""
    from parser.fetch_list import fetch_all
    from parser.fetch_detail import fetch_details_for_items
    from parser.normalize import normalize

    print("─" * 50)
    print("[olimpiada.ru] Загружаем список...")
    raw = fetch_all()

    raw_path = DATA_DIR / "raw.json"
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)
    print(f"[olimpiada.ru] Список: {len(raw)} записей → raw.json")

    print("[olimpiada.ru] Загружаем детали (с кэшированием)...")
    try:
        fetch_details_for_items(raw, rate_limit=0.3)
        with open(DATA_DIR / "raw_with_details.json", "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[olimpiada.ru] Предупреждение при получении деталей: {e}")

    normalized = normalize(raw)
    print(f"[olimpiada.ru] Нормализовано: {len(normalized)}")
    return normalized

def fetch_from_rsosh() -> list[dict]:
    """Загружает данные с rsr-olymp.ru."""
    from parser.fetch_rsosh import fetch_rsosh_list
    from parser.normalize import normalize

    print("─" * 50)
    print("[rsr-olymp.ru] Загружаем список РСОШ...")
    try:
        raw = fetch_rsosh_list()
        print(f"[rsr-olymp.ru] Найдено: {len(raw)}")
        if not raw:
            return []

        normalized = normalize(raw)
        return normalized
    except Exception as e:
        print(f"[rsr-olymp.ru] Ошибка: {e}")
        return []

def fetch_from_minpros() -> list[dict]:
    """Загружает данные из источников Минпросвещения."""
    from parser.fetch_minpros import fetch_all_minpros
    from parser.normalize import normalize

    print("─" * 50)
    print("[Минпросвещения] Загружаем ВсОШ и официальные источники...")
    try:
        raw = fetch_all_minpros()
        print(f"[Минпросвещения] Найдено: {len(raw)}")
        if not raw:
            return []
        normalized = normalize(raw)
        return normalized
    except Exception as e:
        print(f"[Минпросвещения] Ошибка: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Обновление базы олимпиад")
    parser.add_argument(
        "--sources",
        default="all",
        choices=["olimpiada", "rsosh", "minpros", "all"],
        help="Какие источники использовать (default: all)",
    )
    args = parser.parse_args()

    all_normalized: list[dict] = []

    if args.sources in ("olimpiada", "all"):
        items = fetch_from_olimpiada()
        all_normalized.extend(items)

    if args.sources in ("rsosh", "all"):
        items = fetch_from_rsosh()
        all_normalized.extend(items)

    if args.sources in ("minpros", "all"):
        items = fetch_from_minpros()
        all_normalized.extend(items)

    print("─" * 50)
    before = len(all_normalized)
    all_normalized = _deduplicate(all_normalized)
    print(f"После дедупликации: {before} → {len(all_normalized)}")

    _save_normalized(all_normalized)
    print(f"✓ normalized.json обновлён: {len(all_normalized)} олимпиад")

    try:
        import olympiad_data
        olympiad_data.reload()
        print("✓ olympiad_data перезагружен в памяти")
    except Exception:
        pass

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nПрервано пользователем")
    except Exception as e:
        print(f"Ошибка: {e}")
        raise
