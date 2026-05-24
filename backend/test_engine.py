# -*- coding: utf-8 -*-
from olympiad_data import OLYMPIADS
from recommender import rank_olympiads, build_calendar

profile = {
    'name': 'Алексей',
    'grade': 10,
    'subjects': ['математика', 'физика'],
    'region': 'Москва',
    'preparation_level': 'средний',
    'prefer_online': False,
    'goals': 'Поступление в вуз'
}

results = rank_olympiads(profile, top_n=5)
print(f"Найдено рекомендаций: {len(results)}")
for i, r in enumerate(results):
    print(f"  {i+1}. {r['short_name']} — score: {r['recommendation_score']}")

calendar = build_calendar(results)
print(f"\nСобытий в календаре: {len(calendar)}")
for e in calendar[:3]:
    print(f"  {e['date_str']} — {e['olympiad_name']}: {e['stage_name']}")
