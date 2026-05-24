import re

def generate_id(name: str):
    return re.sub(r"[^a-z0-9]+", "_", name.lower())


def normalize(raw_items):
    normalized = []

    for item in raw_items:
        normalized.append({
            "id": generate_id(item["name"]),
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
        })

    return normalized