import json
import os
import re
import time
from typing import Dict, List, Any

import requests
from bs4 import BeautifulSoup


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE_PATH = os.path.join(BASE_DIR, "data", "detail_cache.json")


def _ensure_cache_dir():
	d = os.path.dirname(CACHE_PATH)
	if not os.path.exists(d):
		os.makedirs(d, exist_ok=True)


def _load_cache() -> Dict[str, Any]:
	try:
		with open(CACHE_PATH, "r", encoding="utf-8") as f:
			return json.load(f)
	except Exception:
		return {}


def _save_cache(cache: Dict[str, Any]):
	_ensure_cache_dir()
	with open(CACHE_PATH, "w", encoding="utf-8") as f:
		json.dump(cache, f, ensure_ascii=False, indent=2)


def _safe_text(node) -> str:
	if not node:
		return ""
	return node.get_text(" ", strip=True)


def _parse_grades(text: str) -> List[int]:
	if not text:
		return []
	text = text.replace("—", "-")
	# try to find ranges like 5-7, or lists like 5,6,7
	nums = set()
	for part in re.split(r"[,;]\s*", text):
		# range
		m = re.search(r"(\d{1,2})\s*[-–]\s*(\d{1,2})", part)
		if m:
			a = int(m.group(1))
			b = int(m.group(2))
			for n in range(min(a, b), max(a, b) + 1):
				if 1 <= n <= 11:
					nums.add(n)
			continue
		# single numbers
		for m in re.findall(r"\d{1,2}", part):
			n = int(m)
			if 1 <= n <= 11:
				nums.add(n)

	return sorted(nums)


def _guess_subjects_from_text(text: str) -> List[str]:
	if not text:
		return []
	text = text.lower()
	keywords = {
		"матем": "математика",
		"физ": "физика",
		"информ": "информатика",
		"программ": "информатика",
		"хим": "химия",
		"биол": "биология",
		"истор": "история",
		"литер": "литература",
		"англ": "английский язык",
		"эконом": "экономика",
		"географ": "география",
	}
	found = []
	for k, v in keywords.items():
		if k in text and v not in found:
			found.append(v)
	return found


def _extract_key_values(soup: BeautifulSoup) -> Dict[str, str]:
	out = {}
	# dt/dd sections
	for dl in soup.find_all("dl"):
		dts = dl.find_all("dt")
		dds = dl.find_all("dd")
		for dt, dd in zip(dts, dds):
			k = _safe_text(dt)
			v = _safe_text(dd)
			if k:
				out[k] = v

	# tables
	for table in soup.find_all("table"):
		for tr in table.find_all("tr"):
			tds = tr.find_all(["th", "td"]) or tr.find_all("td")
			if len(tds) >= 2:
				k = _safe_text(tds[0])
				v = _safe_text(tds[1])
				if k:
					out[k] = v

	# bold labels like <b>Организатор:</b> Значение
	for b in soup.find_all(["b", "strong"]):
		k = _safe_text(b)
		if k and k.endswith(":" ):
			kk = k[:-1].strip()
			# try sibling text
			val = ""
			sib = b.next_sibling
			if sib and isinstance(sib, str):
				val = sib.strip()
			if not val:
				val = _safe_text(b.parent)
				val = val.replace(k, "").strip()
			if kk:
				out[kk] = val

	return out


def fetch_detail(url: str, session: requests.Session = None, use_cache: bool = True, force: bool = False) -> Dict[str, Any]:
	"""Fetch and parse detail page for a single activity URL.

	Returns a dict with fields: subjects, grades, stages, description, organizer, tags, prize, online, difficulty, level
	"""
	cache = _load_cache() if use_cache else {}
	if use_cache and not force and url in cache:
		return cache[url]

	if session is None:
		session = requests.Session()
		session.headers.update({
			"User-Agent": "kodikterpils-bot/1.0 (+https://github.com/)"
		})

	detail = {
		"subjects": [],
		"grades": [],
		"stages": [],
		"description": None,
		"organizer": None,
		"tags": [],
		"prize": None,
		"online": None,
		"difficulty": None,
		"level": None,
	}

	tries = 3
	for attempt in range(tries):
		try:
			r = session.get(url, timeout=15)
			r.encoding = r.apparent_encoding
			if r.status_code != 200:
				raise Exception(f"status {r.status_code}")
			html = r.text
			break
		except Exception as e:
			if attempt == tries - 1:
				# give up
				detail["__error"] = str(e)
				if use_cache:
					cache[url] = detail
					_save_cache(cache)
				return detail
			time.sleep(1 + attempt * 0.5)

	soup = BeautifulSoup(html, "html.parser")

	# description
	desc = None
	for sel in [".activity-description", ".description", "#description", "article"]:
		node = soup.select_one(sel)
		if node and _safe_text(node):
			desc = _safe_text(node)
			break
	if not desc:
		# try main content
		main = soup.find("main") or soup.find("div", {"class": "content"})
		if main:
			desc = _safe_text(main)
	if not desc:
		# fallback: body text
		desc = _safe_text(soup.body)
	detail["description"] = desc

	# extract key/value info blocks
	info = _extract_key_values(soup)

	# organizer
	for k, v in info.items():
		lk = k.lower()
		if "организ" in lk or "организац" in lk:
			detail["organizer"] = v
			break

	# subjects
	for k, v in info.items():
		if "предмет" in k.lower() or "направлен" in k.lower():
			# split by comma/;/
			subs = [s.strip() for s in re.split(r"[,;\\|/]", v) if s.strip()]
			detail["subjects"] = subs
			break

	# grades
	for k, v in info.items():
		if "клас" in k.lower():
			detail["grades"] = _parse_grades(v)
			break

	# tags: try to find tag elements
	tags = set()
	for cls in ["tag", "tags", "chip", "badge"]:
		for t in soup.select(f".{cls}"):
			tv = _safe_text(t)
			if tv:
				tags.add(tv)
	# fallback: look for links with /search or /tags
	for a in soup.find_all("a"):
		href = a.get("href", "")
		if "/tag" in href or "/tags" in href or "/search" in href:
			tv = _safe_text(a)
			if tv:
				tags.add(tv)

	detail["tags"] = sorted(tags)

	# stages: look for headings with "Этап"
	stages = []
	for heading in soup.find_all(re.compile(r"h[1-6]")):
		if "этап" in _safe_text(heading).lower() or "дата" in _safe_text(heading).lower():
			# gather following list items or paragraphs
			node = heading.find_next_sibling()
			if node:
				for li in node.find_all("li"):
					stages.append({"name": _safe_text(li), "raw": _safe_text(li)})
				if not stages and node.name == "p":
					stages.append({"name": _safe_text(node), "raw": _safe_text(node)})

	detail["stages"] = stages

	# prize, difficulty, online, level from info dict or description
	for k, v in info.items():
		lk = k.lower()
		if "приз" in lk or "награда" in lk:
			detail["prize"] = v
		if "сложн" in lk:
			detail["difficulty"] = v
		if "онлайн" in lk:
			detail["online"] = True

	if detail["online"] is None and desc and "онлайн" in desc.lower():
		detail["online"] = True

	# if grades empty, try to guess from text
	if not detail["grades"]:
		detail["grades"] = _parse_grades(desc or "")

	# if subjects empty, try to guess from name/description
	if not detail["subjects"]:
		guessed = _guess_subjects_from_text((desc or ""))
		detail["subjects"] = guessed

	# save to cache
	if use_cache:
		cache[url] = detail
		_save_cache(cache)

	return detail


def fetch_details_for_items(items: List[Dict[str, Any]], rate_limit: float = 0.3) -> None:
	"""Mutates `items` in-place, adding key 'detail' for each item with a 'url'. Uses cache to avoid re-fetching."""
	session = requests.Session()
	session.headers.update({"User-Agent": "kodikterpils-bot/1.0"})
	for i, it in enumerate(items):
		url = it.get("url")
		if not url:
			continue
		try:
			d = fetch_detail(url, session=session, use_cache=True)
			it["detail"] = d
		except Exception as e:
			it["detail"] = {"__error": str(e)}
		time.sleep(rate_limit)


if __name__ == "__main__":
	# simple CLI: load raw.json and fetch details for each
	RAW = os.path.join(BASE_DIR, "data", "raw.json")
	if os.path.exists(RAW):
		with open(RAW, "r", encoding="utf-8") as f:
			raw = json.load(f)
		fetch_details_for_items(raw, rate_limit=0.3)
		with open(os.path.join(BASE_DIR, "data", "raw_with_details.json"), "w", encoding="utf-8") as f:
			json.dump(raw, f, ensure_ascii=False, indent=2)
		print("Done. raw_with_details.json written.")

