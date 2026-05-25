import sys
import json
sys.stdout.reconfigure(encoding='utf-8')

with open('data/normalized.json', encoding='utf-8') as f:
    data = json.load(f)

astro = [o for o in data if 'астрономия' in (o.get('subjects') or [])]
print(f'Olympiads with астрономия: {len(astro)}')
for o in astro[:3]:
    print(f'  name={o["name"][:40]}, grades={o["grades"]}, type={o["type"]}')

g10 = [o for o in data if 10 in (o.get('grades') or [])]
print(f'Olympiads for grade 10: {len(g10)}')

# Test rank_olympiads directly
from recommender import rank_olympiads
profile = {
    'name': 'Тест',
    'grade': 10,
    'subjects': ['астрономия'],
    'region': 'Москва',
    'preparation_level': 'средний',
    'prefer_online': False,
    'goals': 'Поступление в сильный вуз'
}
ranked, filters = rank_olympiads(profile)
print(f'\nrank_olympiads result: {len(ranked)} olympiads')
print(f'applied_filters badges: {[b["label"] for b in filters["badges"]]}')
print(f'allowed_types: {filters["allowed_types"]}')
if ranked:
    print(f'Top: {ranked[0]["name"][:60]} score={ranked[0]["recommendation_score"]}')
