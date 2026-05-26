"""Нормализация данных олимпиад из detail_cache в единый формат."""
import re

MONTH_MAP = {
    'янв': 1, 'фев': 2, 'мар': 3, 'апр': 4,
    'май': 5, 'июн': 6, 'июл': 7, 'авг': 8,
    'сен': 9, 'окт': 10, 'ноя': 11, 'дек': 12,
}

SUBJECT_MAP: dict[str, str] = {
    'английский язык':  'английский язык',
    'астрономия':       'астрономия',
    'биология':         'биология',
    'география':        'география',
    'информатика':      'информатика',
    'история':          'история',
    'лингвистика':      'лингвистика',
    'литература':       'литература',
    'математика':       'математика',
    'немецкий язык':    'немецкий язык',
    'обществознание':   'обществознание',
    'право':            'право',
    'робототехника':    'информатика',
    'русский язык':     'русский язык',
    'физика':           'физика',
    'французский язык': 'французский язык',
    'химия':            'химия',
    'экология':         'экология',
    'экономика':        'экономика',

}

SUBJECT_KEYWORDS: dict[str, str] = {
    'матем':    'математика',
    'физик':    'физика',
    'информ':   'информатика',
    'програм':  'информатика',
    'робот':    'информатика',
    'химич':    'химия',
    'химии':    'химия',
    'биолог':   'биология',
    'историч':  'история',
    'истории':  'история',
    'литерат':  'литература',
    'англ':     'английский язык',
    'эконом':   'экономика',
    'географ':  'география',
    'лингв':    'лингвистика',
    'обществ':  'обществознание',
    'правов':   'право',
    'русск':    'русский язык',
    'астроном': 'астрономия',
    'эколог':   'экология',
    'немецк':   'немецкий язык',
    'французск': 'французский язык',
    'филолог':  'литература',
    'филологии': 'литература',
}

def _normalize_subject(raw: str) -> str | None:
    """Приводит название предмета из olimpiada.ru к нашему стандарту."""
    key = raw.replace('\xa0', ' ').strip().lower()
    return SUBJECT_MAP.get(key)

def _subjects_from_cache(raw_subjects: list[str]) -> list[str]:
    """Преобразует список предметов из кэша в наш стандарт."""
    result = []
    seen = set()
    for s in (raw_subjects or []):
        mapped = _normalize_subject(s)
        if mapped and mapped not in seen:
            result.append(mapped)
            seen.add(mapped)
    return result

def _subjects_from_text(text: str) -> list[str]:
    """Извлекает предметы из текста (название/описание) по ключевым словам."""
    text = text.lower()
    result = []
    seen = set()
    for kw, subj in SUBJECT_KEYWORDS.items():
        if kw in text and subj not in seen:
            result.append(subj)
            seen.add(subj)
    return result

def _parse_date(date_str: str) -> tuple[int | None, int | None, int | None, int | None]:
    """
    Разбирает строку даты формата olimpiada.ru.

    Возвращает (start_day, start_month, end_day, end_month).

    Примеры входных строк:
      '15 окт...14 дек'   → (15, 10, 14, 12)
      '19...26 ноя'       → (19, 11, 26, 11)
      '31 янв...1 фев'    → (31, 1, 1, 2)
      '6 фев'             → (6, 2, None, None)
    """
    s = date_str.replace('\xa0', ' ').strip()

    m = re.match(r'(\d+)\s+([а-яёА-ЯЁ]+)\.\.\.(\d+)\s+([а-яёА-ЯЁ]+)', s)
    if m:
        sd, sm_str, ed, em_str = m.group(1), m.group(2), m.group(3), m.group(4)
        sm = MONTH_MAP.get(sm_str[:3].lower())
        em = MONTH_MAP.get(em_str[:3].lower())
        if sm and em:
            return int(sd), sm, int(ed), em

    m = re.match(r'(\d+)\.\.\.(\d+)\s+([а-яёА-ЯЁ]+)', s)
    if m:
        sd, ed, mo_str = m.group(1), m.group(2), m.group(3)
        mo = MONTH_MAP.get(mo_str[:3].lower())
        if mo:
            return int(sd), mo, int(ed), mo

    m = re.match(r'(\d+)\s+([а-яёА-ЯЁ]+)', s)
    if m:
        sd, mo_str = m.group(1), m.group(2)
        mo = MONTH_MAP.get(mo_str[:3].lower())
        if mo:
            return int(sd), mo, None, None

    return None, None, None, None

def _parse_stages(raw_stages: list[dict]) -> list[dict]:
    """Преобразует список этапов из кэша в нормализованный формат."""
    result = []
    for stage in (raw_stages or []):
        name = stage.get('name', '').strip()
        date_str = stage.get('date', '')
        start_day, start_month, end_day, end_month = _parse_date(date_str)

        if not start_month:

            continue

        result.append({
            'name': name,
            'month': start_month,
            'day': start_day or 1,
            'end_month': end_month,
            'end_day': end_day,
            'desc': date_str.replace('\xa0', ' '),
        })
    return result

def _detect_online(detail: dict) -> bool | None:
    """Определяет, доступна ли олимпиада онлайн."""
    fmt = (detail.get('format') or '').lower()
    if 'онлайн' in fmt or 'заочн' in fmt:
        return True
    if 'очн' in fmt or 'личн' in fmt:

        if 'заочн' in fmt:
            return True
        return False
    desc = (detail.get('description') or '').lower()
    if 'онлайн' in desc or 'дистанционн' in desc:
        return True
    return None

def generate_id(name: str, url: str = None) -> str:
    """Генерирует уникальный id для записи."""
    if url:
        m = re.search(r'/activity/(\d+)', url)
        if m:
            return f'activity_{m.group(1)}'
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower())
    slug = slug.strip('-')
    if slug:
        return slug
    return f'id_{abs(hash(name))}'

def normalize(raw_items):
    """Нормализует список сырых олимпиад с деталями в единый формат."""
    normalized = []
    used_ids: set[str] = set()

    for item in raw_items:
        url = item.get('url', '')
        base_id = generate_id(item.get('name', ''), url=url)

        uid = base_id
        suffix = 1
        while uid in used_ids:
            suffix += 1
            uid = f'{base_id}_{suffix}'
        used_ids.add(uid)

        name = item.get('name', '')
        detail = item.get('detail') or {}

        subjects = _subjects_from_cache(detail.get('subjects') or [])
        if not subjects:

            subjects = _subjects_from_text(name)
        if not subjects:
            subjects = _subjects_from_text(detail.get('description') or '')

        stages = _parse_stages(detail.get('stages') or [])

        raw_type = (detail.get('type') or '').lower().strip()
        if 'конкурс' in raw_type:
            etype = 'конкурс'
        elif 'конференц' in raw_type:
            etype = 'конференция'
        elif 'турнир' in raw_type:
            etype = 'турнир'
        else:

            n = name.lower()
            if 'конкурс' in n:
                etype = 'конкурс'
            elif 'конференц' in n:
                etype = 'конференция'
            elif 'турнир' in n:
                etype = 'турнир'
            else:
                etype = 'олимпиада'

        level = detail.get('level')
        if isinstance(level, str):
            try:
                level = int(level)
            except ValueError:
                level = None
        if not isinstance(level, int):
            level = None

        if level == 1:
            difficulty = 'высокий'
        elif level == 2:
            difficulty = 'средний'
        elif level == 3:
            difficulty = 'низкий'
        else:
            difficulty = None

        organizer = detail.get('organizer') or None
        if isinstance(organizer, list):
            organizer = ', '.join(organizer) if organizer else None

        desc = detail.get('description') or None

        if desc and len(desc) < 80 and ('олимпиад' in desc.lower() or 'новост' in desc.lower()):
            desc = None

        entry = {
            'id': uid,
            'name': name,
            'short_name': name,
            'organizer': organizer,
            'source': 'olimpiada.ru',
            'subjects': subjects,
            'tags': sorted(detail.get('tags') or []),
            'grades': sorted(detail.get('grades') or []),
            'level': level,
            'type': etype,
            'stages': stages,
            'difficulty': difficulty,
            'preparation_time_months': None,
            'regions': ['all'],
            'online': _detect_online(detail),
            'prize': detail.get('prize') or None,
            'url': url,
            'description': desc,
            'collaboration_score': 0.5,
        }

        normalized.append(entry)

    return normalized
