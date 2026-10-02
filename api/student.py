"""Student endpoints backed by the unified intelligence service."""
from __future__ import annotations

import sqlite3
from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from api.deps import student_id_header
from shared.nlp.skill_extractor import extract_skills
from shared.services import catalog_matcher as catalog
from shared.services import student_intelligence as intel
from shared.services.explanations import confidence_label
from shared.services.gap_analyzer import get_available_roles
from shared.services.resume_reader import MAX_RESUME_BYTES, ResumeReadError, read_resume_text
from shared.services.taxonomy import get_role, get_skill
from shared.store import db

router = APIRouter(prefix="/api/student", tags=["student"])


class ProfileUpdate(BaseModel):
    name: str = Field("", max_length=120)
    education: str = Field("", max_length=160)
    institution: str = Field("", max_length=160)


class TargetRoleUpdate(BaseModel):
    role_id: Optional[str] = None


class SkillLevelUpdate(BaseModel):
    proficiency: int = Field(..., ge=0, le=100)


class RoadmapUpdate(BaseModel):
    status: Literal["not_started", "in_progress", "completed"]
    progress: Optional[int] = Field(None, ge=0, le=100)


class ResumeTextRequest(BaseModel):
    text: str = Field(..., max_length=200_000)


class ApplyAnalysisRequest(BaseModel):
    analysis_id: str
    replace: bool = True
    skill_ids: Optional[list[str]] = None


def _guard(fn, *args):
    try:
        return fn(*args)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=503, detail="SkillVeda could not reach its local database. Try again.") from exc


# ------------------------------------------------------------------ state
@router.get("/intelligence")
def get_intelligence(student_id: str = Depends(student_id_header)):
    """Unified student state: profile, skills, readiness, gaps, roadmap, courses, jobs."""
    return _guard(intel.build_intelligence, student_id)


@router.get("/profile")
def get_profile(student_id: str = Depends(student_id_header)):
    state = _guard(intel.build_intelligence, student_id)
    return {"student": state["student"], "target_role": state["target_role"]}


@router.put("/profile")
def put_profile(body: ProfileUpdate, student_id: str = Depends(student_id_header)):
    _guard(db.get_or_create_student, student_id)
    _guard(db.update_profile, student_id, body.name.strip(), body.education.strip(), body.institution.strip())
    return get_profile(student_id)


@router.delete("/profile")
def delete_profile(student_id: str = Depends(student_id_header)):
    _guard(db.delete_student, student_id)
    return {"deleted": True}


@router.get("/roles")
def list_roles():
    return {"roles": get_available_roles()}


@router.post("/target-role")
def set_target_role(body: TargetRoleUpdate, student_id: str = Depends(student_id_header)):
    if body.role_id and not get_role(body.role_id):
        raise HTTPException(status_code=404, detail="Unknown target role.")
    _guard(db.get_or_create_student, student_id)
    _guard(db.set_target_role, student_id, body.role_id)
    if body.role_id:
        _guard(db.add_activity, student_id, "role", f"Target role set to {get_role(body.role_id)['title']}")
    return _guard(intel.build_intelligence, student_id)


# ------------------------------------------------------------------ skills
@router.get("/skills")
def get_skills(student_id: str = Depends(student_id_header)):
    state = _guard(intel.build_intelligence, student_id)
    return {"skills": state["skills"]}


@router.get("/skills/{skill_id}")
def get_skill_detail(skill_id: str, student_id: str = Depends(student_id_header)):
    detail = _guard(intel.skill_detail, student_id, skill_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Skill not found in the SkillVeda taxonomy.")
    return detail


@router.put("/skills/{skill_id}")
def put_skill_level(skill_id: str, body: SkillLevelUpdate, student_id: str = Depends(student_id_header)):
    """Student self-assessment. The original NLP estimate is kept alongside it."""
    if not get_skill(skill_id):
        raise HTTPException(status_code=404, detail="Skill not found in the SkillVeda taxonomy.")
    _guard(db.get_or_create_student, student_id)
    _guard(db.set_skill_level, student_id, skill_id, body.proficiency)
    return _guard(intel.skill_detail, student_id, skill_id)


@router.delete("/skills/{skill_id}")
def remove_skill(skill_id: str, student_id: str = Depends(student_id_header)):
    if not _guard(db.delete_skill, student_id, skill_id):
        raise HTTPException(status_code=404, detail="That skill is not in your profile.")
    return {"deleted": True}


# ------------------------------------------------------------------ graph / gap / roadmap
@router.get("/skill-graph")
def get_skill_graph(student_id: str = Depends(student_id_header)):
    return _guard(intel.graph_for_student, student_id)


@router.get("/gap-analysis")
def get_gap_analysis(student_id: str = Depends(student_id_header)):
    state = _guard(intel.build_intelligence, student_id)
    return {k: state[k] for k in ("target_role", "has_skills", "readiness", "strong_skills", "developing_skills", "critical_gaps", "other_skills")}


@router.get("/roadmap")
def get_roadmap(student_id: str = Depends(student_id_header)):
    state = _guard(intel.build_intelligence, student_id)
    return {"target_role": state["target_role"], "has_skills": state["has_skills"], "roadmap": state["roadmap"], "recommended_courses": state["recommended_courses"]}


@router.patch("/roadmap/{skill_id}")
def patch_roadmap_step(skill_id: str, body: RoadmapUpdate, student_id: str = Depends(student_id_header)):
    row = _guard(db.get_or_create_student, student_id)
    role_id = row["target_role_id"]
    if not role_id:
        raise HTTPException(status_code=409, detail="Choose a target role before tracking roadmap progress.")
    state = _guard(intel.build_intelligence, student_id)
    steps = {s["skill_id"]: s for s in (state["roadmap"] or {"steps": []})["steps"]}
    if skill_id not in steps:
        raise HTTPException(status_code=404, detail="That skill is not a step in your current roadmap.")
    progress = body.progress
    if progress is None:
        progress = {"not_started": 0, "in_progress": max(steps[skill_id]["progress"], 10), "completed": 100}[body.status]
    if body.status == "completed":
        progress = 100
    elif body.status == "not_started":
        progress = 0
    _guard(db.set_roadmap_progress, student_id, role_id, skill_id, body.status, progress)
    label = {"completed": "Completed", "in_progress": "Working on", "not_started": "Reset"}[body.status]
    _guard(db.add_activity, student_id, "roadmap", f"{label} {steps[skill_id]['skill_name']} roadmap step")
    return _guard(intel.build_intelligence, student_id)["roadmap"]


# ------------------------------------------------------------------ courses / jobs
@router.get("/courses")
def get_courses(student_id: str = Depends(student_id_header)):
    state = _guard(intel.build_intelligence, student_id)
    return {
        "target_role": state["target_role"],
        "has_skills": state["has_skills"],
        "catalog": state["catalogs"]["courses"],
        "recommendations": state["recommended_courses"],
        "all_courses": [catalog._course_view(c) for c in catalog.all_courses()],
    }


@router.get("/jobs")
def get_jobs(student_id: str = Depends(student_id_header)):
    state = _guard(intel.build_intelligence, student_id)
    role_id = state["target_role"]["id"] if state["target_role"] else None
    return {
        "target_role": state["target_role"],
        "has_skills": state["has_skills"],
        "catalog": state["catalogs"]["jobs"],
        "jobs": catalog.recommend_jobs(state["skills"], role_id),
    }


@router.get("/jobs/{job_id}")
def get_job(job_id: str, student_id: str = Depends(student_id_header)):
    job = catalog.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    state = _guard(intel.build_intelligence, student_id)
    return {**catalog.match_job(job, state["skills"]), "required_skills": job.get("required_skills", []), "catalog": state["catalogs"]["jobs"]}


# ------------------------------------------------------------------ resume
def _analysis_response(student_id: str, filename: Optional[str], text: str):
    try:
        skills = extract_skills(text)
    except Exception as exc:  # NLP failure must not crash the API
        raise HTTPException(status_code=500, detail="The SkillVeda NLP could not analyze this resume.") from exc
    for skill in skills:
        skill["confidence_label"] = confidence_label(skill.get("confidence"))
    _guard(db.get_or_create_student, student_id)
    analysis_id = _guard(db.save_resume_analysis, student_id, filename, skills)
    return {"analysis_id": analysis_id, "filename": filename, "total_skills_found": len(skills), "skills": skills}


@router.post("/resume/analyze")
async def analyze_resume_file(file: UploadFile = File(...), student_id: str = Depends(student_id_header)):
    content = await file.read(MAX_RESUME_BYTES + 1)
    try:
        text = read_resume_text(file.filename or "", content)
    except ResumeReadError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _analysis_response(student_id, file.filename, text)


@router.post("/resume/analyze-text")
def analyze_resume_text(body: ResumeTextRequest, student_id: str = Depends(student_id_header)):
    if len(body.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Text too short. Provide at least 10 characters.")
    return _analysis_response(student_id, None, body.text)


@router.post("/resume/apply")
def apply_resume_analysis(body: ApplyAnalysisRequest, student_id: str = Depends(student_id_header)):
    """Update My Skill Profile from a stored analysis."""
    analysis = _guard(db.get_resume_analysis, student_id, body.analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found. Analyze the resume again.")
    skills = [s for s in analysis["skills"] if get_skill(s.get("skill_id", ""))]
    if body.skill_ids is not None:
        wanted = set(body.skill_ids)
        skills = [s for s in skills if s["skill_id"] in wanted]
    if not skills:
        raise HTTPException(status_code=400, detail="No skills selected to save.")
    _guard(db.save_nlp_skills, student_id, skills, body.replace)
    source = analysis["filename"] or "pasted text"
    _guard(db.add_activity, student_id, "resume", f"Skill profile updated from {source} ({len(skills)} skills)")
    return _guard(intel.build_intelligence, student_id)
