import requests
from bs4 import BeautifulSoup
import time
from urllib.parse import urlparse, parse_qs

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
    # Попробуем сначала использовать AJAX-эндпоинт, который сайт использует для подгрузки
    # (./include/activity/megalist.php). Он принимает те же параметры, что и форма фильтра,
    # и параметр `cnow` — число уже загруженных элементов.
    all_items = []
    seen_urls = set()

    try:
        parsed = urlparse(LIST_URL)
        base_qs = parse_qs(parsed.query, keep_blank_values=True)
        # Преобразуем значения: единичные списки -> строка
        params = {k: (v if len(v) > 1 else v[0]) for k, v in base_qs.items()}

        megalist_url = BASE_URL + '/include/activity/megalist.php'
        while True:
            cnow = len(all_items)
            params_with_cnow = params.copy()
            params_with_cnow['cnow'] = str(cnow)

            print('Запрос megalist:', megalist_url, params_with_cnow)
            r = requests.get(megalist_url, params=params_with_cnow,
                             headers={**HEADERS, 'Referer': LIST_URL, 'X-Requested-With': 'XMLHttpRequest'},
                             timeout=15)
            r.raise_for_status()
            text = r.text.strip()

            if not text or text == 'stop':
                print('megalist: стоп или пустой ответ — закончено')
                break

            items = parse_list_page(text)

            new_count = 0
            for item in items:
                if item['url'] not in seen_urls:
                    all_items.append(item)
                    seen_urls.add(item['url'])
                    new_count += 1

            print(f'Новых из megalist: {new_count}')

            if new_count == 0:
                print('Новых данных нет — остановка (megalist).')
                break

            # Небольшая пауза, чтобы не перегружать сервер
            time.sleep(0.1)

        # Если получили что-то — возвращаем
        if all_items:
            return all_items
    except Exception as e:
        print('megalist error, fall back to page-by-page:', e)

    # Если megalist не сработал — падаем обратно на старую логику с параметром &page=
    page = 1
    while page <= max_pages:
        url = LIST_URL + f"&page={page}"
        print("Парсим:", url)

        try:
            html = fetch_page(url)
        except Exception as e:
            print("Ошибка загрузки страницы:", e)
            break

        items = parse_list_page(html)

        # Считаем только новые
        new_count = 0

        for item in items:
            if item["url"] not in seen_urls:
                all_items.append(item)
                seen_urls.add(item["url"])
                new_count += 1

        print(f"Новых на странице: {new_count}")

        # Если новых больше нет — выходим
        if new_count == 0:
            print("Новых данных нет — остановка.")
            break

        page += 1

    return all_items