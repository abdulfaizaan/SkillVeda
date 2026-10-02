"""
Unified student intelligence.

Combines the stored skill profile (from the SkillVeda NLP or the student's own
edits), the gap engine, the roadmap planner, the graph service and the seeded
catalogs into one coherent state. The frontend reads this instead of every page
recomputing readiness or gaps. No LLM is called here.
"""
from __future__ import annotations

from typing import Any, Optional

from shared.services.catalog_matcher import catalog_meta, recommend_courses, recommend_jobs
from shared.services.explanations import confidence_label, gap_reason, importance_label
from shared.services.gap_analyzer import compute_gap
from shared.services.graph_service import student_graph
from shared.services.roadmap_planner import build_roadmap
from shared.services.taxonomy import get_role, get_skill, skill_name, taxonomy_index
from shared.store import db


def _profile_skills(student_id: str) -> list[dict[str, Any]]:
    rows = db.list_skills(student_id)
    skills = []
    for row in rows:
        skill = get_skill(row["skill_id"])
        if not skill:
            continue
        skills.append({
            "skill_id": row["skill_id"],
            "skill_name": skill["name"],
            "category": skill.get("category", "unknown"),
            "proficiency": row["proficiency"],
            "confidence": row["confidence"],
            "confidence_label": confidence_label(row["confidence"]),
            "evidence": row["evidence"],
            "source": row["source"],
            "nlp_proficiency": row["nlp_proficiency"],
            "updated_at": row["updated_at"],
        })
    return skills


def _student_view(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "education": row["education"],
        "institution": row["institution"],
        "target_role_id": row["target_role_id"],
        "created_at": row["created_at"],
    }


def _gap_items(report: dict[str, Any], levels: dict[str, int], unlocks: dict[str, list[str]]) -> dict[str, list]:
    role_title = report.get("target_role", "")
    out: dict[str, list] = {}
    for key, status in (("strong_skills", "strong"), ("medium_gaps", "developing"), ("critical_gaps", "critical")):
        items = []
        for entry in report.get(key, []):
            sid = entry["skill_id"]
            items.append({
                **entry,
                "status": status,
                "priority": "HIGH" if status == "critical" else "MEDIUM" if status == "developing" else "NONE",
                "importance": importance_label(entry["required_proficiency"]),
                "reason": gap_reason(
                    sid, role_title, entry["user_proficiency"], entry["required_proficiency"],
                    entry["demand_weight"], levels, unlocks.get(sid, []),
                ),
            })
        items.sort(key=lambda i: (-i["gap"], -i["demand_weight"]))
        out[status] = items
    return out


def build_intelligence(student_id: str) -> dict[str, Any]:
    row = db.get_or_create_student(student_id)
    skills = _profile_skills(student_id)
    levels = {s["skill_id"]: s["proficiency"] for s in skills}
    role = get_role(row["target_role_id"])

    base: dict[str, Any] = {
        "student": _student_view(row),
        "target_role": {"id": role["id"], "title": role["title"]} if role else None,
        "skills": skills,
        "has_skills": bool(skills),
        "readiness": None,
        "strong_skills": [],
        "developing_skills": [],
        "critical_gaps": [],
        "other_skills": [],
        "roadmap": None,
        "recommended_courses": [],
        "recommended_jobs": [],
        "next_actions": [],
        "activity": db.list_activity(student_id),
        "catalogs": {"courses": catalog_meta("courses"), "jobs": catalog_meta("jobs")},
    }

    if not role or not skills:
        base["next_actions"] = _next_actions(base)
        return base

    report = compute_gap(skills, role["id"])
    progress = db.get_roadmap_progress(student_id, role["id"])
    roadmap = build_roadmap(report, levels, progress)
    unlocks = {step["skill_id"]: [u["skill_id"] for u in step["unlocks"]] for step in roadmap["steps"]}
    groups = _gap_items(report, levels, unlocks)

    base.update({
        "readiness": {
            "score": report["overall_readiness"],
            "method": report.get("readiness_method"),
            "total_required": report["total_required_skills"],
            "strong_count": report["strong_count"],
            "developing_count": report["medium_gap_count"],
            "critical_count": report["critical_gap_count"],
        },
        "strong_skills": groups["strong"],
        "developing_skills": groups["developing"],
        "critical_gaps": groups["critical"],
        "other_skills": report["irrelevant_skills"],
        "roadmap": roadmap,
        "recommended_courses": recommend_courses(report),
        "recommended_jobs": [_job_summary(j) for j in recommend_jobs(skills, role["id"])[:3]],
    })
    base["next_actions"] = _next_actions(base)
    return base


def _job_summary(job: dict[str, Any]) -> dict[str, Any]:
    return {k: job[k] for k in ("id", "title", "company", "location", "employment_type", "match_score")}


def _next_actions(state: dict[str, Any]) -> list[dict[str, Any]]:
    """Top next steps derived only from the computed state."""
    if not state["has_skills"]:
        return [{"kind": "resume", "title": "Analyze your resume", "detail": "Build your skill profile with the SkillVeda NLP.", "href": "/dashboard/resume"}]
    if not state["target_role"]:
        return [{"kind": "role", "title": "Choose a target career", "detail": "Gap analysis and your roadmap need a target role.", "href": "/dashboard"}]
    actions = []
    roadmap = state["roadmap"] or {"steps": []}
    active = [s for s in roadmap["steps"] if s["status"] != "completed"]
    for step in active[:2]:
        verb = "Continue" if step["status"] == "in_progress" else "Start"
        actions.append({
            "kind": "roadmap",
            "skill_id": step["skill_id"],
            "title": f"{verb} {step['skill_name']}",
            "detail": f"{step['current_level']}% → {step['target_level']}% · about {step['effort_weeks']} week{'s' if step['effort_weeks'] != 1 else ''}",
            "href": f"/dashboard/roadmap?skill={step['skill_id']}",
        })
    if active:
        group = next((g for g in state["recommended_courses"] if g["skill_id"] == active[0]["skill_id"] and g["courses"]), None)
        if group:
            course = group["courses"][0]
            actions.append({
                "kind": "course",
                "skill_id": group["skill_id"],
                "title": course["title"],
                "detail": f"{course['provider']} · covers {group['skill_name']}",
                "href": f"/dashboard/courses?skill={group['skill_id']}",
            })
    if not active:
        actions.append({"kind": "jobs", "title": "Review matching jobs", "detail": "Your roadmap for this role is complete.", "href": "/dashboard/jobs"})
    return actions[:3]


def skill_detail(student_id: str, skill_id: str) -> Optional[dict[str, Any]]:
    """Everything the UI shows when a skill is clicked."""
    skill = get_skill(skill_id)
    if not skill:
        return None
    index = taxonomy_index()
    row = db.get_or_create_student(student_id)
    profile = next((s for s in _profile_skills(student_id) if s["skill_id"] == skill_id), None)
    levels = {s["skill_id"]: s["proficiency"] for s in _profile_skills(student_id)}
    role = get_role(row["target_role_id"])
    requirement = None
    if role:
        req = next((r for r in role.get("required_skills", []) if r["skill_id"] == skill_id), None)
        if req:
            current = levels.get(skill_id, 0)
            required = int(req.get("proficiency_required", 60))
            requirement = {
                "role_id": role["id"],
                "role_title": role["title"],
                "required_level": required,
                "current_level": current,
                "gap": max(required - current, 0),
                "importance": importance_label(required),
                "reason": gap_reason(skill_id, role["title"], current, required, skill.get("demand_weight", 0.5), levels),
            }
    return {
        "skill_id": skill_id,
        "skill_name": skill["name"],
        "category": skill.get("category", "unknown"),
        "demand_weight": skill.get("demand_weight"),
        "profile": profile,
        "target_requirement": requirement,
        "prerequisites": [
            {"skill_id": p, "skill_name": skill_name(p), "user_level": levels.get(p)}
            for p in skill.get("prerequisites", []) if get_skill(p)
        ],
        "related": [
            {"skill_id": r, "skill_name": skill_name(r), "user_level": levels.get(r)}
            for r in skill.get("related", []) if get_skill(r)
        ],
        "unlocks": [
            {"skill_id": u, "skill_name": skill_name(u), "user_level": levels.get(u)}
            for u in index["unlocks"].get(skill_id, [])
        ],
        "required_by_roles": sorted(index["required_by"].get(skill_id, []), key=lambda r: -r["required_proficiency"]),
        "in_roadmap": bool(requirement and requirement["gap"] > 0 and levels.get(skill_id, 0) < requirement["required_level"] * 0.8),
    }


def graph_for_student(student_id: str) -> dict[str, Any]:
    row = db.get_or_create_student(student_id)
    skills = _profile_skills(student_id)
    levels = {s["skill_id"]: s["proficiency"] for s in skills}
    role = get_role(row["target_role_id"])
    report = compute_gap(skills, role["id"]) if role else None
    graph = student_graph(levels, report, {s["skill_id"]: s["confidence"] for s in skills})
    graph["has_skills"] = bool(skills)
    return graph


def ai_context(student_id: str, focus_skill_id: Optional[str] = None) -> dict[str, Any]:
    """Small structured context for the optional LLM layer (never the whole DB)."""
    state = build_intelligence(student_id)
    ctx: dict[str, Any] = {
        "target_role": state["target_role"]["title"] if state["target_role"] else None,
        "readiness": state["readiness"]["score"] if state["readiness"] else None,
        "top_skills": [f"{s['skill_name']} {s['proficiency']}" for s in state["skills"][:8]],
        "critical_gaps": [f"{g['skill_name']} (have {g['user_proficiency']}, need {g['required_proficiency']})" for g in state["critical_gaps"][:6]],
        "developing": [f"{g['skill_name']} (have {g['user_proficiency']}, need {g['required_proficiency']})" for g in state["developing_skills"][:4]],
        "roadmap": [f"{s['skill_name']} (~{s['effort_weeks']}w, {s['status']})" for s in (state["roadmap"] or {"steps": []})["steps"][:8]],
    }
    if focus_skill_id:
        detail = skill_detail(student_id, focus_skill_id)
        if detail:
            ctx["focus_skill"] = {
                "name": detail["skill_name"],
                "current_level": detail["profile"]["proficiency"] if detail["profile"] else 0,
                "requirement": detail["target_requirement"],
                "prerequisites": [p["skill_name"] for p in detail["prerequisites"]],
                "unlocks": [u["skill_name"] for u in detail["unlocks"][:6]],
                "roles_requiring": [r["role_title"] for r in detail["required_by_roles"][:5]],
            }
    return ctx

