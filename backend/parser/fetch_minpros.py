"""
Парсер Министерства просвещения РФ.

Источники:
  - https://edu.gov.ru/activity/main_activities/additional/olimpiads/
    (официальный Перечень олимпиад, утверждаемый Минпросвещения)
  - https://vserosolymp.rudn.ru/
    (Всероссийская олимпиада школьников — ВсОШ)
  - https://olimpiada.ru/activities?type=any&perechen=on
    (фильтр «только из перечня» на olimpiada.ru — наиболее надёжный источник)
"""

import re
import time
from typing import Any

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9",
}

VSOSH_SUBJECTS = [
    "математика", "физика", "химия", "биология", "информатика",
    "история", "обществознание", "литература", "русский язык",
    "английский язык", "немецкий язык", "французский язык",
    "испанский язык", "китайский язык", "география", "экономика",
    "право", "экология", "астрономия", "технология", "физическая культура",
    "ОБЖ", "искусство (МХК)",
]

def fetch_vsosh() -> list[dict[str, Any]]:
    """
    Генерирует карточки Всероссийской олимпиады школьников (ВсОШ).

    ВсОШ проводится по фиксированным предметам каждый учебный год.
    Данные статически закодированы (перечень не меняется годами).
    """
    items = []
    for subject in VSOSH_SUBJECTS:
        items.append({
            "name": f"Всероссийская олимпиада школьников по {subject.lower()}",
            "url": "https://vserosolymp.rudn.ru/",
            "level": None,
            "source": "vsosh / Минпросвещения",
            "subjects": [subject],
            "grades": list(range(9, 12)),
            "type": "всероссийская олимпиада",
            "description": (
                "Всероссийская олимпиада школьников (ВсОШ) — крупнейшая академическая "
                f"олимпиада России по предмету «{subject}». "
                "Проводится Министерством просвещения РФ ежегодно. "
                "Этапы: школьный → муниципальный → региональный → заключительный."
            ),
            "stages_desc": [
                {"name": "Школьный этап", "months": [9, 10]},
                {"name": "Муниципальный этап", "months": [11, 12]},
                {"name": "Региональный этап", "months": [1, 2]},
                {"name": "Заключительный этап", "months": [3, 4]},
            ],
        })
    return items

def fetch_edu_gov_list() -> list[dict[str, Any]]:
    """
    Пытается загрузить перечень олимпиад с edu.gov.ru.
    Возвращает список {name, url, source}.
    """
    session = requests.Session()
    session.headers.update(HEADERS)
    all_items: list[dict[str, Any]] = []
    seen: set[str] = set()

    urls_to_try = [
        "https://edu.gov.ru/activity/main_activities/additional/olimpiads/",
        "https://edu.gov.ru/olimpiads",
    ]

    for url in urls_to_try:
        print(f"[МинПрос] Запрос: {url}")
        try:
            r = session.get(url, timeout=15)
            r.encoding = r.apparent_encoding
            if r.status_code != 200:
                print(f"[МинПрос] HTTP {r.status_code}")
                continue
        except Exception as e:
            print(f"[МинПрос] Ошибка: {e}")
            continue

        soup = BeautifulSoup(r.text, "html.parser")

        for link in soup.find_all("a", href=True):
            href = link["href"]
            name = link.get_text(strip=True)
            if not name or len(name) < 10:
                continue
            if "олимпиад" not in name.lower() and "конкурс" not in name.lower():
                continue

            full_url = href if href.startswith("http") else "https://edu.gov.ru" + href
            if full_url in seen:
                continue
            seen.add(full_url)

            all_items.append({
                "name": name,
                "url": full_url,
                "source": "edu.gov.ru",
            })

        time.sleep(0.5)

    print(f"[МинПрос] Итого: {len(all_items)} записей")
    return all_items

def fetch_regional_olympiads() -> list[dict[str, Any]]:
    """
    Список региональных олимпиадных порталов.
    Возвращает заглушки-источники для последующего парсинга.
    """
    REGIONAL_SOURCES = [
        {
            "region": "Москва",
            "name": "Олимпиады Московской электронной школы",
            "url": "https://uchebnik.mos.ru/catalogue?type=1&subject_id=0",
            "source": "mos.ru",
        },
        {
            "region": "Санкт-Петербург",
            "name": "Олимпиады Санкт-Петербурга (СПбОШ)",
            "url": "https://spbopen.ru/",
            "source": "spbopen.ru",
        },
        {
            "region": "Россия",
            "name": "Сириус — образовательные программы и олимпиады",
            "url": "https://edu.sirius.online/",
            "source": "sirius.online",
        },
        {
            "region": "Россия",
            "name": "Учитель года / Олимпиада НТИ",
            "url": "https://ntiolympiad.ru/",
            "source": "ntiolympiad.ru",
        },
        {
            "region": "Россия",
            "name": "Иннополис — Innopolis Open",
            "url": "https://olymp.innopolis.university/",
            "source": "innopolis.university",
        },
    ]
    return REGIONAL_SOURCES

def fetch_all_minpros() -> list[dict[str, Any]]:
    """Агрегирует все источники Минпросвещения и региональных порталов."""
    result = []

    vsosh = fetch_vsosh()
    result.extend(vsosh)
    print(f"[МинПрос] ВсОШ: {len(vsosh)} предметов")

    try:
        edu = fetch_edu_gov_list()
        result.extend(edu)
    except Exception as e:
        print(f"[МинПрос] edu.gov.ru недоступен: {e}")

    regional = fetch_regional_olympiads()
    result.extend(regional)
    print(f"[МинПрос] Региональных источников: {len(regional)}")

    return result

if __name__ == "__main__":
    import json
    items = fetch_all_minpros()
    print(f"\nИтого: {len(items)}")
    print(json.dumps(items[:3], ensure_ascii=False, indent=2))
