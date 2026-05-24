import requests
from bs4 import BeautifulSoup
import time

BASE_URL = "https://olimpiada.ru"
LIST_URL = "https://olimpiada.ru/activities?type=any&class=any&period=year&perechen=on"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def fetch_page(url):
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.text


def parse_list_page(html):
    soup = BeautifulSoup(html, "html.parser")

    links = soup.select("a[href^='/activity/']")
    activities = []

    for link in links:
        name = link.text.strip()
        href = link.get("href")

        if not name or not href:
            continue

        activities.append({
            "name": name,
            "url": BASE_URL + href
        })

    return activities


def fetch_all(max_pages=50):
    page = 1
    all_items = []
    seen_urls = set()

    while page <= max_pages:
        url = LIST_URL + f"&page={page}"
        print("Парсим:", url)

        try:
            html = fetch_page(url)
        except Exception as e:
            print("Ошибка загрузки страницы:", e)
            break

        items = parse_list_page(html)

        # ✅ Считаем только новые
        new_count = 0

        for item in items:
            if item["url"] not in seen_urls:
                all_items.append(item)
                seen_urls.add(item["url"])
                new_count += 1

        print(f"Новых на странице: {new_count}")

        # ✅ Если новых больше нет — выходим
        if new_count == 0:
            print("Новых данных нет — остановка.")
            break

        page += 1

    return all_items