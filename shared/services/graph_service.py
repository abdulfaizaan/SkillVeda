"""
Skill graph views built from the taxonomy relationships.

Relationships (prerequisite / related / role requirement) always come from
the taxonomy. Student levels and gap status are overlaid, never invented.
"""
from __future__ import annotations

from typing import Any, Optional

from shared.services.taxonomy import get_role, get_skill, taxonomy_index


def _skill_node(skill_id: str, **extra: Any) -> dict[str, Any]:
    skill = get_skill(skill_id) or {}
    node = {
        "id": skill_id,
        "label": skill.get("name", skill_id.replace("_", " ").title()),
        "category": skill.get("category", "unknown"),
    }
    node.update(extra)
    return node


def _clamp_int(value: Any) -> Optional[int]:
    try:
        return max(0, min(100, int(value)))
    except (TypeError, ValueError):
        return None


def _clamp_float(value: Any) -> Optional[float]:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return None


def search_skills(query: str, limit: int = 10) -> list[dict[str, Any]]:
    query = query.strip().casefold()
    if len(query) < 2:
        return []
    matches = []
    for skill_id, skill in taxonomy_index()["skills"].items():
        name = str(skill.get("name", skill_id.replace("_", " ")))
        aliases = skill.get("aliases", [])
        if isinstance(aliases, str):
            aliases = [aliases]
        values = [v.casefold() for v in [name, skill_id.replace("_", " "), *map(str, aliases)]]
        if not any(query in v for v in values):
            continue
        rank = 0 if query in values else 1 if any(v.startswith(query) for v in values) else 2
        matches.append((rank, name.casefold(), {"id": skill_id, "label": name, "category": skill.get("category", "unknown")}))
    matches.sort(key=lambda item: (item[0], item[1]))
    return [item[2] for item in matches[: max(1, min(limit, 20))]]


def neighborhood(center_id: str, overlay: Optional[dict[str, dict]] = None) -> Optional[dict[str, Any]]:
    """A skill's direct prerequisites and related skills (the original graph view)."""
    center = get_skill(center_id)
    if not center:
        return None
    skills = taxonomy_index()["skills"]
    overlay = overlay or {}
    prerequisite_ids = set(center.get("prerequisites", [])) - {center_id}
    related_ids = set(center.get("related", [])) - prerequisite_ids - {center_id}
    neighbor_ids = (prerequisite_ids | related_ids) & skills.keys()

    nodes = [_skill_node(nid, **overlay.get(nid, {})) for nid in neighbor_ids]
    nodes.sort(key=lambda node: (node["label"].casefold(), node["id"]))
    edges = [
        {"source": pid, "target": center_id, "type": "prerequisite"}
        for pid in prerequisite_ids if pid in skills
    ] + [
        {"source": center_id, "target": rid, "type": "related"}
        for rid in related_ids if rid in skills
    ]
    edges.sort(key=lambda edge: (edge["type"], edge["source"], edge["target"]))
    return {"center": _skill_node(center_id, **overlay.get(center_id, {})), "nodes": nodes, "edges": edges}


def resume_graph(extracted: list[dict]) -> Optional[dict[str, Any]]:
    """Neighborhood of the strongest extracted skill plus the full resume inventory."""
    overlay: dict[str, dict] = {}
    for item in extracted:
        sid = str(item.get("skill_id", "")).strip()
        if not get_skill(sid):
            continue
        overlay[sid] = {
            "in_resume": True,
            "proficiency": _clamp_int(item.get("proficiency")),
            "confidence": _clamp_float(item.get("confidence")),
            "evidence": str(item.get("evidence", ""))[:240],
        }
    if not overlay:
        return None
    focus_id = max(overlay, key=lambda sid: overlay[sid]["proficiency"] or 0)
    graph = neighborhood(focus_id, overlay)
    assert graph is not None
    for node in graph["nodes"]:
        node.setdefault("in_resume", False)
        node.setdefault("proficiency", None)
        node.setdefault("confidence", None)
        node.setdefault("evidence", "")
    graph["resume_skills"] = sorted(
        (_skill_node(sid, **data) for sid, data in overlay.items()),
        key=lambda node: (node["label"].casefold(), node["id"]),
    )
    return graph


def student_graph(
    user_levels: dict[str, int],
    gap_report: Optional[dict[str, Any]],
    confidences: Optional[dict[str, Optional[float]]] = None,
) -> dict[str, Any]:
    """
    Graph of the student's world: the target role, its required skills, the
    student's own skills, and direct prerequisites of required skills.
    """
    confidences = confidences or {}
    status_by_skill: dict[str, str] = {}
    required_by_skill: dict[str, int] = {}
    role = get_role(gap_report.get("target_role_id")) if gap_report else None
    if gap_report and role:
        for key, status in (("strong_skills", "strong"), ("medium_gaps", "developing"), ("critical_gaps", "critical")):
            for entry in gap_report.get(key, []):
                status_by_skill[entry["skill_id"]] = status
                required_by_skill[entry["skill_id"]] = entry["required_proficiency"]

    node_ids: dict[str, str] = {}  # skill_id -> why it is in the graph
    for sid in required_by_skill:
        node_ids[sid] = "required"
    for sid in user_levels:
        if get_skill(sid):
            node_ids.setdefault(sid, "profile")
    for sid in list(required_by_skill):
        for pid in (get_skill(sid) or {}).get("prerequisites", []):
            if get_skill(pid):
                node_ids.setdefault(pid, "prerequisite")

    nodes: list[dict[str, Any]] = []
    if role:
        nodes.append({
            "id": "role:" + role["id"],
            "label": role["title"],
            "kind": "role",
            "category": "role",
            "readiness": gap_report.get("overall_readiness") if gap_report else None,
        })
    for sid, reason in node_ids.items():
        level = user_levels.get(sid, 0)
        required = required_by_skill.get(sid)
        nodes.append(_skill_node(
            sid,
            kind="skill",
            membership=reason,
            in_profile=sid in user_levels,
            current_level=level if sid in user_levels else None,
            confidence=confidences.get(sid),
            required_level=required,
            gap=max(required - level, 0) if required is not None else None,
            status=status_by_skill.get(sid, "owned" if sid in user_levels else "context"),
        ))

    edges: list[dict[str, Any]] = []
    if role:
        for sid, required in required_by_skill.items():
            edges.append({"source": "role:" + role["id"], "target": sid, "type": "requires", "required_level": required})
    present = set(node_ids)
    seen_related: set[frozenset] = set()
    for sid in present:
        skill = get_skill(sid) or {}
        for pid in skill.get("prerequisites", []):
            if pid in present and pid != sid:
                edges.append({"source": pid, "target": sid, "type": "prerequisite"})
        for rid in skill.get("related", []):
            pair = frozenset((sid, rid))
            if rid in present and rid != sid and pair not in seen_related:
                if sid in (get_skill(rid) or {}).get("prerequisites", []) or rid in skill.get("prerequisites", []):
                    continue  # already drawn as a prerequisite
                seen_related.add(pair)
                edges.append({"source": sid, "target": rid, "type": "related"})

    domains = sorted({n["category"] for n in nodes if n.get("kind") == "skill"})
    return {
        "role": {"id": role["id"], "title": role["title"]} if role else None,
        "nodes": nodes,
        "edges": edges,
        "domains": domains,
    }
