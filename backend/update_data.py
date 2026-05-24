import json
from pathlib import Path
from parser.fetch_list import fetch_all
from parser.normalize import normalize
from parser.fetch_detail import fetch_details_for_items

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

def main():
    print("Загрузка списка олимпиад...")
    raw = fetch_all()

    DATA_DIR.mkdir(exist_ok=True)

    with open(DATA_DIR / "raw.json", "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)

    print("Запрос деталей для каждой записи (с кешированием, это может занять время)...")
    try:
        fetch_details_for_items(raw, rate_limit=0.3)
        with open(DATA_DIR / "raw_with_details.json", "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False, indent=2)
    except Exception:
        print("Не удалось получить детали для некоторых записей; продолжаю нормализацию без них.")

    print("Нормализация...")
    normalized = normalize(raw)

    with open(DATA_DIR / "normalized.json", "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)

    print(f"Готово. Всего олимпиад: {len(normalized)}")
    # Если backend уже запущен, попробуем перезагрузить данные в памяти
    try:
        import olympiad_data
        olympiad_data.reload()
        print('olympiad_data reloaded in memory')
    except Exception:
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("Ошибка при обновлении данных:", e)