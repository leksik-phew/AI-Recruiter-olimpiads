"""Рекомендательная система олимпиад.

Логика:
  1. Автоматические жёсткие фильтры по профилю (класс, предметы, цель, онлайн)
  2. Content-based scoring для отфильтрованного набора
  3. Нормализация оценок внутри показываемого набора (лучшая → 100%)
"""
try:
    import olympiad_data
except Exception:
    from backend import olympiad_data

from typing import List, Dict, Any, Tuple

# ──────────────────────────────────────────────────────────────
# Цель → тип олимпиады (автофильтр)
# ──────────────────────────────────────────────────────────────
GOAL_TYPE_RULES: Dict[str, Dict] = {
    "Поступление в сильный вуз": {
        "allowed_types": ["олимпиада"],
        "reason": "БВИ и льготы при поступлении дают только олимпиады из Перечня РСОШ",
        "label": "только олимпиады (БВИ)",
    },
    "Стипендии и бонусы": {
        "allowed_types": ["олимпиада", "конкурс"],
        "reason": "Стипендии и денежные бонусы чаще всего дают олимпиады и конкурсы",
        "label": "олимпиады и конкурсы",
    },
}

# Ключевые слова для извлечения предметов из названия (когда subjects пустой)
SUBJECT_KEYWORDS: Dict[str, str] = {
    "матем":     "математика",
    "физик":     "физика",
    "информ":    "информатика",
    "програм":   "информатика",
    "робот":     "информатика",
    "химич":     "химия",
    "химии":     "химия",
    "биолог":    "биология",
    "историч":   "история",
    "истории":   "история",
    "литерат":   "литература",
    "англ":      "английский язык",
    "эконом":    "экономика",
    "географ":   "география",
    "лингв":     "лингвистика",
    "обществ":   "обществознание",
    "правов":    "право",
    "русск":     "русский язык",
    "астроном":  "астрономия",
    "космонав":  "астрономия",
    "эколог":    "экология",
    "немецк":    "немецкий язык",
    "французск": "французский язык",
    "филолог":   "литература",
    "химич":     "химия",
    "биохим":    "химия",
    "правоед":   "право",
    "правов":    "право",
}


def _get_olympiad_effective_subjects(olympiad: Dict) -> set:
    """Возвращает множество предметов олимпиады (из данных + из названия)."""
    subjects = set(olympiad.get("subjects") or [])
    if not subjects:
        text = (
            (olympiad.get("name") or "") + " " +
            (olympiad.get("description") or "")
        ).lower()
        for kw, subj in SUBJECT_KEYWORDS.items():
            if kw in text:
                subjects.add(subj)
    return subjects


def _get_primary_subjects(olympiad: Dict) -> set:
    """
    Возвращает «главные» предметы олимпиады — те, что явно упомянуты в её названии.
    Если из названия ничего не извлечь, возвращает пустое множество.
    Используется для различия «Олимпиада по физике» (главный предмет — физика)
    и «Олимпиада по лингвистике» (у которой физика лишь второстепенный раздел).
    """
    text = (
        (olympiad.get("name") or "") + " " +
        (olympiad.get("short_name") or "")
    ).lower()
    primary = set()
    for kw, subj in SUBJECT_KEYWORDS.items():
        if kw in text:
            primary.add(subj)
    return primary


def _build_auto_filters(profile: Dict) -> Dict:
    """
    Составляет набор автофильтров на основе профиля.
    Возвращает словарь с параметрами фильтрации и описаниями для UI.
    """
    goal = profile.get("goals", "")
    student_subjects = list(profile.get("subjects") or [])
    grade = profile.get("grade", 9)
    prefer_online = profile.get("prefer_online", False)

    # Тип по цели
    goal_rule = GOAL_TYPE_RULES.get(goal)
    allowed_types = goal_rule["allowed_types"] if goal_rule else None

    badges = []
    if grade:
        badges.append({"label": f"{grade} класс", "icon": "grade"})
    if student_subjects:
        badges.append({"label": ", ".join(student_subjects), "icon": "subjects"})
    if goal_rule:
        badges.append({"label": goal_rule["label"], "icon": "goal", "reason": goal_rule["reason"]})
    if prefer_online:
        badges.append({"label": "онлайн", "icon": "online"})

    return {
        "grade": grade,
        "subjects": student_subjects,
        "allowed_types": allowed_types,
        "prefer_online": prefer_online,
        "goal": goal,
        "badges": badges,
    }


def compute_content_score(olympiad: Dict, profile: Dict) -> float:
    """
    Вычисляет сырую релевантность олимпиады для профиля.
    Жёсткие фильтры (класс, предметы, тип) применяются ДО вызова этой функции.
    """
    score = 0.0
    student_subjects = set(profile.get("subjects") or [])
    olympiad_subjects = _get_olympiad_effective_subjects(olympiad)

    # 1. Совпадение предметов (вес 0.55)
    #
    # Стратегия двухуровневого матчинга:
    #
    # • Если название олимпиады раскрывает её основной предмет (содержит ключевые слова) —
    #   используем «первичное/вторичное» разделение:
    #     subject_score = primary_recall + secondary_overlap * 0.30
    #   Пример: «Олимпиада по физике» (primary=физика) при student=[физика,матем]
    #     → primary_recall = 1/2 = 0.5, secondary = 1*0.30/2 = 0.15 → total 0.65
    #
    # • Если название не несёт предметной информации (engineering/technology/general) —
    #   используем F1 (harmonic mean recall×precision), чтобы широкие олимпиады
    #   с 4–5 предметами не получали искусственно высокий балл:
    #     F1 = 2·recall·precision / (recall+precision)
    #   Пример: «Инженерная олимпиада» (4 субj, 2 совпадают) → precision=0.5
    #     F1 = 2·1.0·0.5/1.5 = 0.67 < 1.0 ✓
    primary_subjects = _get_primary_subjects(olympiad)

    if primary_subjects:
        overlap_primary   = len(student_subjects & primary_subjects)
        overlap_secondary = len((student_subjects & olympiad_subjects) - primary_subjects)
        if student_subjects:
            primary_recall  = overlap_primary / len(student_subjects)
            secondary_score = (overlap_secondary * 0.30) / len(student_subjects)
            subject_score   = min(primary_recall + secondary_score, 1.0)
        else:
            subject_score = 0.5
    else:
        # Название не раскрывает предмет → F1 по всем subjects
        n_overlap  = len(student_subjects & olympiad_subjects)
        recall     = n_overlap / max(len(student_subjects), 1)
        precision  = n_overlap / max(len(olympiad_subjects), 1)
        denom      = recall + precision
        subject_score = (2 * recall * precision / denom) if denom > 0 else 0.0

    score += subject_score * 0.55

    # 2. Совпадение тегов (вес 0.15)
    tag_score = 0.0
    for subject in student_subjects:
        subject_tags = set(olympiad_data.SUBJECT_TAGS.get(subject, []))
        olympiad_tags = set(olympiad.get("tags") or [])
        if subject_tags and olympiad_tags:
            overlap = len(subject_tags & olympiad_tags)
            tag_score += overlap / len(subject_tags)
    tag_score = min(tag_score / max(len(student_subjects), 1), 1.0)
    score += tag_score * 0.15

    # 3. Уровень подготовки vs. сложность (вес 0.15)
    prep_level = olympiad_data.PREPARATION_LEVELS.get(
        profile.get("preparation_level", "средний"), 0.6
    )
    difficulty_map = {"низкий": 0.3, "средний": 0.6, "высокий": 1.0}
    olympiad_difficulty = difficulty_map.get(
        olympiad.get("difficulty") or "средний", 0.6
    )

    if prep_level >= olympiad_difficulty:
        level_score = 1.0
    elif prep_level >= olympiad_difficulty * 0.75:
        level_score = 0.7
    else:
        level_score = 0.3
    score += level_score * 0.15

    # 4. Онлайн-формат (вес 0.05)
    if profile.get("prefer_online") and olympiad.get("online"):
        score += 0.05
    elif not profile.get("prefer_online") and not olympiad.get("online"):
        score += 0.025  # небольшой бонус, но не такой же вес

    # 5. Уровень РСОШ (вес 0.10): чем выше статус — тем лучше для поступления
    rsosh_level = olympiad.get("level")
    goal = profile.get("goals", "")
    if rsosh_level == 1:
        level_bonus = 1.0
    elif rsosh_level == 2:
        level_bonus = 0.7
    elif rsosh_level == 3:
        level_bonus = 0.4
    else:
        level_bonus = 0.2

    # Если цель — поступление/БВИ, уровень РСОШ особо важен
    rsosh_weight = 0.12 if "поступлен" in goal.lower() or "вуз" in goal.lower() else 0.05
    score += level_bonus * rsosh_weight

    return min(score, 1.0)


def rank_olympiads(profile: Dict, top_n: int = None) -> Tuple[List[Dict], Dict]:
    """
    Ранжирует олимпиады по профилю школьника.

    Возвращает:
      (список_рекомендаций, applied_filters)
      где applied_filters содержит описание автофильтров для UI.
    """
    auto_filters = _build_auto_filters(profile)
    student_subjects = set(profile.get("subjects") or [])
    grade = profile.get("grade", 9)
    allowed_types = auto_filters["allowed_types"]
    prefer_online = auto_filters["prefer_online"]

    scored = []

    for olympiad in olympiad_data.OLYMPIADS:
        # ── Жёсткий фильтр: тип по цели ──────────────────────────
        if allowed_types and olympiad.get("type") not in allowed_types:
            continue

        # ── Жёсткий фильтр: класс ─────────────────────────────────
        grades = olympiad.get("grades") or []
        if grades and grade not in grades:
            continue

        # ── Жёсткий фильтр: предметы ─────────────────────────────
        if student_subjects:
            olympiad_subjects = _get_olympiad_effective_subjects(olympiad)
            overlap = student_subjects & olympiad_subjects
            if not overlap:
                continue

            # Отсеиваем «случайные» совпадения: если совпадающие предметы занимают
            # менее 20% всех предметов олимпиады И название не подтверждает тематику.
            # Это убирает, например, языковые олимпиады с математикой как доп. треком
            # из подборки студента, выбравшего только математику.
            primary = _get_primary_subjects(olympiad)
            primary_overlap = student_subjects & primary
            overlap_fraction = len(overlap) / max(len(olympiad_subjects), 1)
            if not primary_overlap and overlap_fraction <= 0.20:
                continue

        # ── Подсчёт очков ─────────────────────────────────────────
        score = compute_content_score(olympiad, profile)

        scored.append({
            **olympiad,
            "_raw_score": score,  # для нормализации
            "recommendation_score": round(score, 3),
            "match_reasons": generate_match_reasons(olympiad, profile, score),
        })

    scored.sort(key=lambda x: x["_raw_score"], reverse=True)

    # ── Нормализация: лучший матч = 1.0 (100%) ────────────────────
    if scored:
        max_raw = scored[0]["_raw_score"]
        if max_raw > 0:
            for item in scored:
                item["recommendation_score"] = round(item["_raw_score"] / max_raw, 3)

    # Убираем служебное поле
    for item in scored:
        item.pop("_raw_score", None)

    result = scored[:top_n] if top_n is not None else scored
    return result, auto_filters


def generate_match_reasons(olympiad: Dict, profile: Dict, score: float) -> List[str]:
    """Генерирует текстовые причины совпадения."""
    reasons = []

    student_subjects = set(profile.get("subjects") or [])
    olympiad_subjects = _get_olympiad_effective_subjects(olympiad)
    matching = student_subjects & olympiad_subjects

    if matching:
        reasons.append(f"Предмет{'ы' if len(matching) > 1 else ''}: {', '.join(matching)}")

    rsosh_level = olympiad.get("level")
    if rsosh_level == 1:
        reasons.append("I уровень РСОШ — даёт право на БВИ")
    elif rsosh_level == 2:
        reasons.append("II уровень РСОШ — льготы при поступлении")
    elif rsosh_level == 3:
        reasons.append("III уровень РСОШ")

    prep_level = profile.get("preparation_level", "средний")
    difficulty = olympiad.get("difficulty")
    if prep_level == "продвинутый" and difficulty == "высокий":
        reasons.append("Уровень сложности под твою подготовку")
    elif prep_level == "начальный" and difficulty in ("низкий", "средний"):
        reasons.append("Доступный уровень для старта")

    if olympiad.get("online") and profile.get("prefer_online"):
        reasons.append("Есть онлайн-участие")

    return reasons


def build_calendar(ranked_olympiads: List[Dict], academic_year_start: int = 2025) -> List[Dict]:
    """Строит календарь этапов с диапазонами дат на учебный год."""
    events = []

    for olympiad in ranked_olympiads:
        for stage in olympiad.get("stages") or []:
            month = stage.get("month")
            day = stage.get("day")
            if not month or not day:
                continue

            year = academic_year_start if month >= 9 else academic_year_start + 1

            end_month = stage.get("end_month")
            end_day = stage.get("end_day")
            if end_month:
                end_year = academic_year_start if end_month >= 9 else academic_year_start + 1
            else:
                end_year = None

            if end_month and end_year == year and end_month < month:
                end_year = year + 1

            events.append({
                "olympiad_id": olympiad["id"],
                "olympiad_name": olympiad["short_name"],
                "stage_name": stage["name"],
                "month": month,
                "day": day,
                "year": year,
                "date_str": f"{day:02d}.{month:02d}.{year}",
                "end_month": end_month,
                "end_day": end_day,
                "end_year": end_year,
                "end_date_str": (
                    f"{end_day:02d}.{end_month:02d}.{end_year}"
                    if end_month and end_day and end_year else None
                ),
                "desc": stage.get("desc", ""),
                "priority": "high" if olympiad["recommendation_score"] >= 0.75 else "medium",
                "recommendation_score": olympiad["recommendation_score"],
                "type": olympiad.get("type", "олимпиада"),
                "level": olympiad.get("level"),
                "subjects": olympiad.get("subjects") or [],
            })

    events.sort(key=lambda e: (e["year"], e["month"], e["day"]))
    return events
