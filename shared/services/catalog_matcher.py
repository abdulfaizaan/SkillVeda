"""
Course and job matching against SkillVeda skill gaps.

The catalogs in shared/data/seed are seeded demo data (see their _meta). A
course is only recommended for a skill it lists in skills_taught, and jobs are
scored with the same gap algorithm used for taxonomy roles.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from shared.services.gap_analyzer import compute_gap_for_requirements
from shared.services.taxonomy import get_skill, skill_name

SEED_DIR = Path(__file__).resolve().parent.parent / "data" / "seed"
LEVEL_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}


@lru_cache(maxsize=None)
def _load(name: str) -> dict[str, Any]:
    path = SEED_DIR / name
    if not path.exists():
        return {"_meta": {"kind": "missing"}, name.split(".")[0]: []}
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def catalog_meta(kind: str) -> dict[str, Any]:
    data = _load(f"{kind}.json")
    meta = dict(data.get("_meta", {}))
    meta["is_demo"] = meta.get("kind") == "seeded_demo_catalog"
    return meta


def all_courses() -> list[dict[str, Any]]:
    return [c for c in _load("courses.json").get("courses", []) if isinstance(c, dict)]


def all_jobs() -> list[dict[str, Any]]:
    return [j for j in _load("jobs.json").get("jobs", []) if isinstance(j, dict)]


def get_course(course_id: str) -> Optional[dict[str, Any]]:
    return next((c for c in all_courses() if c.get("id") == course_id), None)


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    return next((j for j in all_jobs() if j.get("id") == job_id), None)


def _suggested_level(current_level: int) -> str:
    if current_level < 30:
        return "beginner"
    if current_level < 65:
        return "intermediate"
    return "advanced"


def _course_view(course: dict[str, Any]) -> dict[str, Any]:
    return {
        **course,
        "skills_taught": [
            {"skill_id": sid, "skill_name": skill_name(sid)}
            for sid in course.get("skills_taught", []) if get_skill(sid)
        ],
    }


def courses_for_skill(skill_id: str, current_level: int = 0, limit: int = 3) -> list[dict[str, Any]]:
    """Courses whose skills_taught includes the skill, best level fit first."""
    target = LEVEL_ORDER[_suggested_level(current_level)]
    matches = [c for c in all_courses() if skill_id in c.get("skills_taught", [])]
    matches.sort(key=lambda c: (
        abs(LEVEL_ORDER.get(c.get("level", "beginner"), 0) - target),
        0 if c.get("skills_taught", [None])[0] == skill_id else 1,
        c.get("duration_weeks", 99),
        c.get("title", ""),
    ))
    return [_course_view(c) for c in matches[:limit]]


def recommend_courses(gap_report: Optional[dict[str, Any]], per_skill: int = 3) -> list[dict[str, Any]]:
    """One group per critical or developing gap, in gap-engine priority order."""
    if not gap_report:
        return []
    groups = []
    for step in gap_report.get("learning_roadmap", []):
        sid = step["skill_id"]
        groups.append({
            "skill_id": sid,
            "skill_name": step["skill_name"],
            "priority": step["priority"],
            "current_level": step["current_level"],
            "target_level": step["target_level"],
            "gap": max(step["target_level"] - step["current_level"], 0),
            "suggested_level": _suggested_level(step["current_level"]),
            "courses": courses_for_skill(sid, step["current_level"], per_skill),
        })
    return groups


def match_job(job: dict[str, Any], user_skills: list[dict]) -> dict[str, Any]:
    requirements = [
        {"skill_id": r["skill_id"], "proficiency_required": r.get("level", 60)}
        for r in job.get("required_skills", []) if get_skill(r.get("skill_id", ""))
    ]
    report = compute_gap_for_requirements(user_skills, requirements, job.get("title", ""), job.get("role_id") or "")
    levels = {s.get("skill_id"): s.get("proficiency", 0) for s in user_skills if isinstance(s, dict)}
    preferred = [
        {"skill_id": sid, "skill_name": skill_name(sid), "has_skill": (levels.get(sid) or 0) > 0}
        for sid in job.get("preferred_skills", []) if get_skill(sid)
    ]
    gaps = report["critical_gaps"] + report["medium_gaps"]
    gaps.sort(key=lambda g: (-g["gap"], -g["demand_weight"]))
    preparation = []
    for gap in gaps[:3]:
        course = next(iter(courses_for_skill(gap["skill_id"], gap["user_proficiency"], 1)), None)
        preparation.append({
            "skill_id": gap["skill_id"],
            "skill_name": gap["skill_name"],
            "gap": gap["gap"],
            "course": {"id": course["id"], "title": course["title"], "url": course["url"]} if course else None,
        })
    return {
        "id": job["id"],
        "title": job.get("title", ""),
        "company": job.get("company", ""),
        "location": job.get("location", ""),
        "employment_type": job.get("employment_type", ""),
        "role_id": job.get("role_id"),
        "description": job.get("description", ""),
        "source_url": job.get("source_url"),
        "match_score": report["overall_readiness"],
        "strong_matches": report["strong_skills"],
        "developing": report["medium_gaps"],
        "missing": report["critical_gaps"],
        "preferred_skills": preferred,
        "preparation": preparation,
    }


def recommend_jobs(user_skills: list[dict], target_role_id: Optional[str] = None) -> list[dict[str, Any]]:
    matches = [match_job(job, user_skills) for job in all_jobs()]
    matches.sort(key=lambda m: (0 if target_role_id and m["role_id"] == target_role_id else 1, -m["match_score"], m["title"]))
    return matches

