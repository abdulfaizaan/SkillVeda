"""
Prerequisite-aware learning roadmap.

Starts from compute_gap()'s learning_roadmap (which keeps the gap engine's
priority and effort estimates) and reorders it so a skill never appears
before another plan skill it depends on in the taxonomy prerequisite chain.
"""
from __future__ import annotations

import heapq
from typing import Any

from shared.services.explanations import gap_reason
from shared.services.taxonomy import get_skill, skill_category, skill_name


def _ancestors(skill_id: str) -> set[str]:
    """All transitive prerequisites of a skill (cycle safe)."""
    seen: set[str] = set()
    stack = list((get_skill(skill_id) or {}).get("prerequisites", []))
    while stack:
        current = stack.pop()
        if current in seen or current == skill_id:
            continue
        seen.add(current)
        stack.extend((get_skill(current) or {}).get("prerequisites", []))
    return seen


def order_by_prerequisites(skill_ids: list[str]) -> list[str]:
    """Topological order over plan skills; ties keep the incoming priority order."""
    rank = {sid: i for i, sid in enumerate(skill_ids)}
    plan = set(skill_ids)
    depends_on = {sid: (_ancestors(sid) & plan) - {sid} for sid in skill_ids}
    # Mutual dependencies (taxonomy cycles) are broken in favour of priority order.
    for sid in skill_ids:
        for dep in list(depends_on[sid]):
            if sid in depends_on[dep] and rank[dep] > rank[sid]:
                depends_on[sid].discard(dep)

    indegree = {sid: len(deps) for sid, deps in depends_on.items()}
    dependents: dict[str, list[str]] = {sid: [] for sid in skill_ids}
    for sid, deps in depends_on.items():
        for dep in deps:
            dependents[dep].append(sid)

    heap = [(rank[sid], sid) for sid in skill_ids if indegree[sid] == 0]
    heapq.heapify(heap)
    ordered: list[str] = []
    while heap:
        _, sid = heapq.heappop(heap)
        ordered.append(sid)
        for nxt in dependents[sid]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                heapq.heappush(heap, (rank[nxt], nxt))
    # Anything left (should not happen after cycle breaking) keeps priority order.
    ordered.extend(sid for sid in skill_ids if sid not in ordered)
    return ordered


def build_roadmap(
    gap_report: dict[str, Any],
    user_levels: dict[str, int],
    progress: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Return ordered roadmap steps plus foundation skills and progress totals."""
    engine_steps = {step["skill_id"]: step for step in gap_report.get("learning_roadmap", [])}
    gap_entries = {
        entry["skill_id"]: entry
        for entry in gap_report.get("critical_gaps", []) + gap_report.get("medium_gaps", [])
    }
    ordered_ids = order_by_prerequisites(list(engine_steps))
    plan = set(ordered_ids)
    role_title = gap_report.get("target_role", "")

    steps = []
    for index, sid in enumerate(ordered_ids, start=1):
        engine = engine_steps[sid]
        entry = gap_entries.get(sid, {})
        skill = get_skill(sid) or {}
        prereqs = [
            {
                "skill_id": pid,
                "skill_name": skill_name(pid),
                "user_level": user_levels.get(pid, 0),
                "in_plan": pid in plan,
                "has_skill": user_levels.get(pid, 0) > 0,
            }
            for pid in skill.get("prerequisites", [])
            if get_skill(pid)
        ]
        unlocks = [other for other in ordered_ids if other != sid and sid in _ancestors(other)]
        saved = progress.get(sid, {})
        steps.append({
            "order": index,
            "skill_id": sid,
            "skill_name": engine["skill_name"],
            "category": skill_category(sid),
            "priority": engine["priority"],
            "current_level": engine["current_level"],
            "target_level": engine["target_level"],
            "gap": max(engine["target_level"] - engine["current_level"], 0),
            "effort_weeks": engine["effort_estimate_weeks"],
            "demand_weight": entry.get("demand_weight", skill.get("demand_weight", 0.5)),
            "prerequisites": prereqs,
            "unlocks": [{"skill_id": u, "skill_name": skill_name(u)} for u in unlocks],
            "reason": gap_reason(
                sid, role_title, engine["current_level"], engine["target_level"],
                entry.get("demand_weight", skill.get("demand_weight", 0.5)), user_levels, unlocks,
            ),
            "status": saved.get("status", "not_started"),
            "progress": saved.get("progress", 0),
            "progress_updated_at": saved.get("updated_at"),
        })

    foundation = [
        {
            "skill_id": s["skill_id"],
            "skill_name": s["skill_name"],
            "current_level": s["user_proficiency"],
            "target_level": s["required_proficiency"],
        }
        for s in gap_report.get("strong_skills", [])
    ]

    total_weeks = sum(step["effort_weeks"] for step in steps)
    done_weeks = sum(step["effort_weeks"] * step["progress"] / 100 for step in steps)
    return {
        "role_id": gap_report.get("target_role_id"),
        "role_title": role_title,
        "foundation": foundation,
        "steps": steps,
        "summary": {
            "total_steps": len(steps),
            "completed_steps": sum(1 for step in steps if step["status"] == "completed"),
            "in_progress_steps": sum(1 for step in steps if step["status"] == "in_progress"),
            "total_weeks": total_weeks,
            "percent_complete": round(done_weeks / total_weeks * 100) if total_weeks else 0,
        },
    }
