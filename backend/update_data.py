import json
from pathlib import Path
from parser.fetch_list import fetch_all
from parser.normalize import normalize

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

def main():
    print("Загрузка списка олимпиад...")
    raw = fetch_all()

    DATA_DIR.mkdir(exist_ok=True)

    with open(DATA_DIR / "raw.json", "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)

    print("Нормализация...")
    normalized = normalize(raw)

    with open(DATA_DIR / "normalized.json", "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)

    print(f"Готово. Всего олимпиад: {len(normalized)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("Ошибка при обновлении данных:", e)