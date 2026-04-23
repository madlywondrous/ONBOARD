"""Schedule service for ONBOARD F1 Dashboard.
Parses the official F1 calendar iCal feed (same as f1-dash) and exposes
rounds + sessions with caching.
"""

from __future__ import annotations

import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from icalendar import Calendar

SCHEDULE_ICAL_URL = os.getenv(
    "SCHEDULE_ICAL_URL",
    "https://ics.ecal.com/ecal-sub/660897ca63f9ca0008bcbea6/Formula%201.ics",
)
SCHEDULE_CACHE_TTL_SECONDS = int(os.getenv("SCHEDULE_CACHE_TTL_SECONDS", "1800"))

_NAME_REGEX = re.compile(r"FORMULA 1 (?P<name>.+) - (?P<kind>.+)")


class _ScheduleCache:
    def __init__(self) -> None:
        self.timestamp: float = 0.0
        self.data: List[Dict[str, Any]] = []

    def fresh(self) -> bool:
        return (time.time() - self.timestamp) < SCHEDULE_CACHE_TTL_SECONDS

    def set(self, data: List[Dict[str, Any]]) -> None:
        self.data = data
        self.timestamp = time.time()


_schedule_cache = _ScheduleCache()


def _to_utc_iso(value: Any) -> Optional[str]:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return None


def _parse_summary(summary: str) -> Optional[Dict[str, str]]:
    match = _NAME_REGEX.match(summary)
    if not match:
        return None
    return {"name": match.group("name"), "kind": match.group("kind")}


def _find_round(rounds: List[Dict[str, Any]], name: str) -> Optional[Dict[str, Any]]:
    for entry in rounds:
        if entry.get("name") == name:
            return entry
    return None


def _parse_calendar(cal_bytes: bytes, year: int) -> List[Dict[str, Any]]:
    rounds: List[Dict[str, Any]] = []
    calendar = Calendar.from_ical(cal_bytes)

    for component in calendar.walk():
        if component.name != "VEVENT":
            continue

        summary = component.get("SUMMARY")
        location = component.get("LOCATION")
        dt_start = component.get("DTSTART")
        dt_end = component.get("DTEND")

        if not summary or not dt_start or not dt_end:
            continue

        summary_text = str(summary)
        parsed = _parse_summary(summary_text)
        if not parsed:
            continue

        start_dt = dt_start.dt if hasattr(dt_start, "dt") else None
        end_dt = dt_end.dt if hasattr(dt_end, "dt") else None
        if not isinstance(start_dt, datetime) or not isinstance(end_dt, datetime):
            continue

        start_iso = _to_utc_iso(start_dt)
        end_iso = _to_utc_iso(end_dt)
        if not start_iso or not end_iso:
            continue

        round_name = parsed["name"]
        session_kind = parsed["kind"]
        country_name = str(location) if location else ""

        round_entry = _find_round(rounds, round_name)
        session_entry = {
            "kind": session_kind,
            "start": start_iso,
            "end": end_iso,
        }

        if round_entry is None:
            round_entry = {
                "name": round_name,
                "countryName": country_name,
                "countryKey": None,
                "start": start_iso,
                "end": end_iso,
                "sessions": [session_entry],
                "over": False,
            }
            if start_dt.year == year:
                rounds.append(round_entry)
        else:
            round_entry["sessions"].append(session_entry)
            if start_iso < round_entry["start"]:
                round_entry["start"] = start_iso
            if end_iso > round_entry["end"]:
                round_entry["end"] = end_iso

    rounds.sort(key=lambda entry: entry["start"])

    now_iso = _to_utc_iso(datetime.now(timezone.utc)) or ""
    for round_entry in rounds:
        round_entry["over"] = round_entry["end"] < now_iso
        round_entry["sessions"].sort(key=lambda entry: entry["start"])

    return rounds


async def get_schedule(year: Optional[int] = None) -> List[Dict[str, Any]]:
    if _schedule_cache.data and _schedule_cache.fresh():
        return _schedule_cache.data

    target_year = year or datetime.now(timezone.utc).year

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        response = await client.get(SCHEDULE_ICAL_URL)
        response.raise_for_status()
        rounds = _parse_calendar(response.content, target_year)

    _schedule_cache.set(rounds)
    return rounds


async def get_next_round(year: Optional[int] = None) -> Optional[Dict[str, Any]]:
    rounds = await get_schedule(year)
    for round_entry in rounds:
        if not round_entry.get("over"):
            return round_entry
    return None
