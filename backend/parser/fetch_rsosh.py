"""
Парсер РСОШ (Российский совет олимпиад школьников).

Источник: https://rsr-olymp.ru/
Публикует официальный Перечень олимпиад школьников — уровни I, II, III.
Данные обновляются ежегодно приказом Минпросвещения.
"""

import re
import time
from typing import Any

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://rsr-olymp.ru"
LIST_URL = "https://rsr-olymp.ru/olimpiads/list"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9",
}

# Приказ Минпросвещения — резервный URL (когда обновляется список)
MINPROS_PERECHEN_URL = (
    "https://docs.edu.gov.ru/document/doc/perechen-olimpiad"
)


def _safe_text(node) -> str:
    if not node:
        return ""
    return node.get_text(" ", strip=True)


def _parse_level(text: str) -> int | None:
    """Извлекает уровень РСОШ (I=1, II=2, III=3) из текста."""
    m = re.search(r'\b(I{1,3}|1|2|3)\s*(уровень|level|ур)', text, re.IGNORECASE)
    if m:
        raw = m.group(1).upper()
        if raw in ('I', '1'):
            return 1
        if raw in ('II', '2'):
            return 2
        if raw in ('III', '3'):
            return 3
    return None


def fetch_rsosh_list(max_pages: int = 20) -> list[dict[str, Any]]:
    """
    Загружает список олимпиад с сайта rsr-olymp.ru.

    Возвращает список словарей {name, url, level, source}.
    """
    session = requests.Session()
    session.headers.update(HEADERS)
    all_items: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for page in range(1, max_pages + 1):
        url = LIST_URL if page == 1 else f"{LIST_URL}?page={page}"
        print(f"[РСОШ] Страница {page}: {url}")

        try:
            r = session.get(url, timeout=15)
            r.encoding = r.apparent_encoding
            if r.status_code != 200:
                print(f"[РСОШ] HTTP {r.status_code} — стоп")
                break
        except Exception as e:
            print(f"[РСОШ] Ошибка: {e}")
            break

        soup = BeautifulSoup(r.text, "html.parser")

        # Ищем ссылки на олимпиады (варианты CSS-структур rsr-olymp.ru)
        items_found = 0
        for link in soup.select("a[href*='/olimpiads/'], a[href*='/olympiad/']"):
            href = link.get("href", "")
            name = _safe_text(link)
            if not name or len(name) < 5:
                continue

            full_url = href if href.startswith("http") else BASE_URL + href
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            # Попробуем найти уровень рядом с ссылкой
            parent = link.find_parent(["tr", "li", "div", "article"])
            level_text = _safe_text(parent) if parent else name
            level = _parse_level(level_text)

            all_items.append({
                "name": name,
                "url": full_url,
                "level": level,
                "source": "rsr-olymp.ru",
            })
            items_found += 1

        # Также ищем строки таблицы — часто сайты РСОШ используют таблицы
        for row in soup.select("table tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            name = _safe_text(cells[0])
            if not name or len(name) < 5 or "олимпиад" not in name.lower():
                continue

            level_str = _safe_text(cells[-1]) if len(cells) > 2 else ""
            level = _parse_level(level_str)

            # Ищем URL в строке
            a = row.find("a")
            href = a.get("href", "") if a else ""
            if not href:
                continue
            full_url = href if href.startswith("http") else BASE_URL + href
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            all_items.append({
                "name": name,
                "url": full_url,
                "level": level,
                "source": "rsr-olymp.ru",
            })
            items_found += 1

        print(f"[РСОШ] Найдено на странице {page}: {items_found}")
        if items_found == 0:
            print("[РСОШ] Новых нет — стоп")
            break

        time.sleep(0.5)

    print(f"[РСОШ] Итого: {len(all_items)} олимпиад")
    return all_items


if __name__ == "__main__":
    items = fetch_rsosh_list()
    import json
    print(json.dumps(items[:5], ensure_ascii=False, indent=2))
