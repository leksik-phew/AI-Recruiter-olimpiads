"""
Рекомендательная система олимпиад.
Реализует content-based filtering на тегах.
"""
from olympiad_data import OLYMPIADS, SUBJECT_TAGS, PREPARATION_LEVELS
from typing import List, Dict, Any
import math


def compute_content_score(olympiad: Dict, profile: Dict) -> float:
    """
    Вычисляет релевантность олимпиады для профиля школьника.
    Content-based scoring на основе тегов, предметов и параметров.
    """
    score = 0.0

    # 1. Совпадение предметов (главный фактор, вес 0.5)
    student_subjects = set(profile.get("subjects", []))
    olympiad_subjects = set(olympiad.get("subjects", []))
    subject_overlap = len(student_subjects & olympiad_subjects)
    if subject_overlap == 0:
        return 0.0  # Не подходит совсем
    subject_score = subject_overlap / max(len(student_subjects), 1)
    score += subject_score * 0.5

    # 2. Совпадение тегов (вес 0.2)
    tag_score = 0.0
    for subject in student_subjects:
        subject_tags = set(SUBJECT_TAGS.get(subject, []))
        olympiad_tags = set(olympiad.get("tags", []))
        if subject_tags and olympiad_tags:
            overlap = len(subject_tags & olympiad_tags)
            tag_score += overlap / len(subject_tags)
    tag_score = min(tag_score / max(len(student_subjects), 1), 1.0)
    score += tag_score * 0.2

    # 3. Подходящий класс (фильтр)
    grade = profile.get("grade", 9)
    if grade not in olympiad.get("grades", []):
        return 0.0

    # 4. Уровень подготовки vs. сложность (вес 0.15)
    prep_level = PREPARATION_LEVELS.get(profile.get("preparation_level", "средний"), 0.6)
    difficulty_map = {"низкий": 0.3, "средний": 0.6, "высокий": 1.0}
    olympiad_difficulty = difficulty_map.get(olympiad.get("difficulty", "средний"), 0.6)

    if prep_level >= olympiad_difficulty:
        level_score = 1.0
    elif prep_level >= olympiad_difficulty * 0.7:
        level_score = 0.7
    else:
        level_score = 0.3

    score += level_score * 0.15

    # 5. Онлайн-формат (вес 0.05)
    if profile.get("prefer_online", False) and olympiad.get("online", False):
        score += 0.05
    elif not profile.get("prefer_online", False) and not olympiad.get("online", False):
        score += 0.05

    # 6. Коллаборативный сигнал (вес 0.1)
    # Синтетический популярный сигнал от похожих профилей
    collaboration_score = olympiad.get("collaboration_score", 0.5)
    score += collaboration_score * 0.1

    return min(score, 1.0)


def rank_olympiads(profile: Dict, top_n: int = 10) -> List[Dict]:
    """Ранжирует олимпиады по профилю школьника."""
    scored = []
    for olympiad in OLYMPIADS:
        score = compute_content_score(olympiad, profile)
        if score > 0:
            scored.append({
                **olympiad,
                "recommendation_score": round(score, 3),
                "match_reasons": generate_match_reasons(olympiad, profile, score),
            })

    scored.sort(key=lambda x: x["recommendation_score"], reverse=True)
    return scored[:top_n]


def generate_match_reasons(olympiad: Dict, profile: Dict, score: float) -> List[str]:
    """Генерирует текстовые причины совпадения."""
    reasons = []

    # Предметы
    student_subjects = set(profile.get("subjects", []))
    olympiad_subjects = set(olympiad.get("subjects", []))
    matching = student_subjects & olympiad_subjects
    if matching:
        subjects_str = ", ".join(matching)
        reasons.append(f"Совпадение по предметам: {subjects_str}")

    # Уровень
    prep_level = profile.get("preparation_level", "средний")
    olympiad_difficulty = olympiad.get("difficulty", "средний")
    if prep_level == "продвинутый" and olympiad_difficulty == "высокий":
        reasons.append("Соответствует вашему высокому уровню подготовки")
    elif prep_level == "начальный" and olympiad_difficulty in ["низкий", "средний"]:
        reasons.append("Доступный уровень для старта")
    elif prep_level == "средний":
        reasons.append("Подходящий уровень сложности")

    # Онлайн
    if olympiad.get("online") and profile.get("prefer_online"):
        reasons.append("Доступно онлайн — удобно для вашего региона")

    # Уровень олимпиады
    if olympiad.get("level") == 1:
        reasons.append("Олимпиада I уровня — высокий статус, льготы при поступлении")

    # Тип
    type_map = {"олимпиада": "олимпиада", "конкурс": "конкурс проектов", "конференция": "научная конференция"}
    reasons.append(f"Формат: {type_map.get(olympiad.get('type'), olympiad.get('type', ''))}")

    return reasons


def build_calendar(ranked_olympiads: List[Dict], academic_year_start: int = 2025) -> List[Dict]:
    """Строит календарь дедлайнов на учебный год."""
    events = []

    for olympiad in ranked_olympiads:
        for stage in olympiad.get("stages", []):
            month = stage["month"]
            # Определяем год: сентябрь-декабрь — год начала, январь-август — следующий год
            year = academic_year_start if month >= 9 else academic_year_start + 1

            events.append({
                "olympiad_id": olympiad["id"],
                "olympiad_name": olympiad["short_name"],
                "stage_name": stage["name"],
                "month": month,
                "day": stage["day"],
                "year": year,
                "date_str": f"{stage['day']:02d}.{month:02d}.{year}",
                "desc": stage.get("desc", ""),
                "priority": "high" if olympiad["recommendation_score"] > 0.7 else "medium",
                "recommendation_score": olympiad["recommendation_score"],
                "type": olympiad.get("type", "олимпиада"),
            })

    # Сортируем по дате
    events.sort(key=lambda e: (e["year"], e["month"], e["day"]))
    return events
