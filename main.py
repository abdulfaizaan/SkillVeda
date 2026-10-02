"""
SkillGraph Bharat - Main API Server

Run with: uvicorn main:app --reload --port 8000
Docs at:  http://localhost:8000/docs
"""
import sys
import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Add project root to path so shared imports work
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

# Load backend-only settings (LLM keys, DB path) from SkillVeda/.env if present.
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass

from shared.nlp.skill_extractor import extract_skills
from shared.services.gap_analyzer import compute_gap, get_available_roles
from api.student import router as student_router
from api.ai import router as ai_router

# ============================================================
# App Setup
# ============================================================
app = FastAPI(
    title="SkillGraph Bharat API",
    description="AI-Powered Workforce Intelligence & Skill Gap Platform",
    version="1.0.0"
)

# Only the local frontend may call the API from a browser. Override with
# CORS_ORIGINS="http://host1,http://host2".
_cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3005,http://127.0.0.1:3005").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(student_router)
app.include_router(ai_router)


# ============================================================
# Request / Response Models
# ============================================================
class ExtractSkillsRequest(BaseModel):
    text: str

class GapAnalysisRequest(BaseModel):
    text: str
    target_role_id: str

class DirectGapRequest(BaseModel):
    skills: list[dict]
    target_role_id: str

class ResumeGraphRequest(BaseModel):
    skills: list[dict]


# ============================================================
# Health Check
# ============================================================
@app.get("/")
def root():
    return {
        "name": "SkillGraph Bharat API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}


# ============================================================
# Skill Extraction Endpoints
# ============================================================
@app.post("/api/extract-skills")
def api_extract_skills(req: ExtractSkillsRequest):
    """
    Extract skills from any unstructured text (resume, JD, syllabus).
    
    Returns a list of detected skills with proficiency and confidence scores.
    """
    if not req.text or len(req.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Text too short. Provide at least 10 characters.")
    
    skills = extract_skills(req.text)
    return {
        "total_skills_found": len(skills),
        "skills": skills
    }


@app.post("/api/extract-skills/file")
async def api_extract_skills_file(file: UploadFile = File(...)):
    """
    Upload a file (PDF or TXT) and extract skills from it.
    """
    import io

    max_file_bytes = 10 * 1024 * 1024
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
    
    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".pdf", ".txt"}:
        raise HTTPException(status_code=415, detail="Unsupported file type. Upload a text-based PDF or TXT file.")

    content = await file.read(max_file_bytes + 1)
    if len(content) > max_file_bytes:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB upload limit.")
    text = ""

    if suffix == ".pdf":
        try:
            import PyPDF2
        except ImportError as exc:
            raise HTTPException(status_code=503, detail="PDF support is unavailable. Install the backend requirements and restart the API.") from exc
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content), strict=False)
            if pdf_reader.is_encrypted:
                raise HTTPException(status_code=400, detail="This PDF is password protected. Upload an unlocked PDF or paste the text.")
            text = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Could not read this PDF. Make sure it is a valid, text-based PDF.") from exc
    else:
        text = content.decode("utf-8-sig", errors="replace")
    
    if len(text.strip()) < 10:
        raise HTTPException(status_code=400, detail="No readable text was found. Scanned image PDFs need OCR; try a text-based PDF or paste the resume text.")
    
    skills = extract_skills(text)
    return {
        "filename": file.filename,
        "total_skills_found": len(skills),
        "skills": skills
    }


# ============================================================
# Gap Analysis Endpoints
# ============================================================
@app.post("/api/gap-analysis")
def api_gap_analysis(req: GapAnalysisRequest):
    """
    Full pipeline: Extract skills from text → Compare against target role → Return gap report.
    
    This is the primary endpoint for the Student portal.
    """
    # Step 1: Extract skills from text
    extracted = extract_skills(req.text)
    
    # Step 2: Run gap analysis
    report = compute_gap(extracted, req.target_role_id)
    
    return {
        "extracted_skills": extracted,
        "gap_report": report
    }


@app.post("/api/gap-analysis/direct")
def api_gap_analysis_direct(req: DirectGapRequest):
    """
    Gap analysis with pre-extracted skills (skip NLP step).
    Useful when frontend already has the skill profile.
    """
    report = compute_gap(req.skills, req.target_role_id)
    return {"gap_report": report}


# ============================================================
# Taxonomy / Role Endpoints
# ============================================================
@app.get("/api/roles")
def api_get_roles():
    """Return all available roles from the skill taxonomy."""
    roles = get_available_roles()
    return {"total_roles": len(roles), "roles": roles}


@app.get("/api/roles/{role_id}/requirements")
def api_get_role_requirements(role_id: str):
    """Get the required skills for a specific role."""
    # Use gap analyzer with empty skills to get full requirements
    report = compute_gap([], role_id)
    if "error" in report:
        raise HTTPException(status_code=404, detail=report["error"])
    
    all_required = report["critical_gaps"]  # With empty user skills, everything is a critical gap
    return {
        "role_id": role_id,
        "role_title": report["target_role"],
        "total_required": len(all_required),
        "required_skills": [
            {
                "skill_id": s["skill_id"],
                "skill_name": s["skill_name"],
                "category": s["category"],
                "required_proficiency": s["required_proficiency"],
                "demand_weight": s["demand_weight"]
            }
            for s in all_required
        ]
    }


# ============================================================
# Employer-Specific Endpoints
# ============================================================
@app.post("/api/employer/analyze-jd")
def api_analyze_jd(req: ExtractSkillsRequest):
    """
    Employer portal: Analyze a Job Description.
    Extracts required skills and returns market context.
    """
    skills = extract_skills(req.text)
    return {
        "total_skills_required": len(skills),
        "required_skills": skills,
        "hiring_insight": {
            "high_demand_skills": [s for s in skills if s.get("proficiency", 0) >= 60],
            "niche_skills": [s for s in skills if s.get("proficiency", 0) < 40]
        }
    }


# ============================================================
# Institution-Specific Endpoints
# ============================================================
@app.post("/api/institution/analyze-syllabus")
def api_analyze_syllabus(req: ExtractSkillsRequest):
    """
    Institution portal: Analyze a course syllabus.
    Extracts skills taught and compares against market demand.
    """
    import json
    from shared.services.gap_analyzer import _load_taxonomy, _get_skill_demand

    taught_skills = extract_skills(req.text)
    taxonomy = _load_taxonomy()

    # Compute curriculum coverage
    taught_ids = {s["skill_id"] for s in taught_skills}

    # Get top 50 most in-demand skills from taxonomy
    all_skills = taxonomy.get("skills", [])
    top_demand = sorted(all_skills, key=lambda x: x.get("demand_weight", 0), reverse=True)[:50]

    covered = []
    gaps = []
    for skill in top_demand:
        entry = {
            "skill_id": skill["id"],
            "skill_name": skill["name"],
            "category": skill["category"],
            "demand_weight": skill.get("demand_weight", 0)
        }
        if skill["id"] in taught_ids:
            entry["status"] = "COVERED"
            covered.append(entry)
        else:
            entry["status"] = "GAP"
            gaps.append(entry)

    coverage_pct = int((len(covered) / len(top_demand)) * 100) if top_demand else 0

    return {
        "skills_taught": taught_skills,
        "total_taught": len(taught_skills),
        "market_coverage_percentage": coverage_pct,
        "covered_skills": covered,
        "curriculum_gaps": gaps[:20],  # Top 20 gaps by demand
        "recommendations": [
            f"Add '{g['skill_name']}' to curriculum (Market demand: {g['demand_weight']:.0%})"
            for g in gaps[:5]
        ]
    }


# ============================================================
# Graph Endpoints
# ============================================================
@app.get("/api/skills/search")
def api_search_skills(q: str = "", limit: int = 10):
    """Search the skill taxonomy for graph nodes the user can open."""
    from shared.services.gap_analyzer import _load_taxonomy

    query = q.strip().casefold()
    if len(query) < 2:
        return []

    taxonomy = _load_taxonomy()
    matches = []
    for skill in taxonomy.get("skills", []):
        skill_id = str(skill.get("id", ""))
        name = str(skill.get("name", skill_id.replace("_", " ")))
        aliases = skill.get("aliases", [])
        if isinstance(aliases, str):
            aliases = [aliases]

        searchable = [name, skill_id.replace("_", " "), *[str(alias) for alias in aliases]]
        normalized = [value.casefold() for value in searchable]
        if not any(query in value for value in normalized):
            continue

        exact_match = any(query == value for value in normalized)
        prefix_match = any(value.startswith(query) for value in normalized)
        rank = 0 if exact_match else 1 if prefix_match else 2
        matches.append((rank, name.casefold(), {
            "id": skill_id,
            "label": name,
            "category": skill.get("category", "unknown"),
        }))

    bounded_limit = max(1, min(limit, 20))
    matches.sort(key=lambda item: (item[0], item[1]))
    return [item[2] for item in matches[:bounded_limit]]


@app.post("/api/graph/resume")
def api_get_resume_skill_graph(req: ResumeGraphRequest):
    """Build a graph from the skills actually extracted from a learner's resume."""
    from shared.services.gap_analyzer import _load_taxonomy

    taxonomy = _load_taxonomy()
    skills_by_id = {
        str(skill.get("id")): skill
        for skill in taxonomy.get("skills", [])
        if skill.get("id")
    }

    resume_nodes_by_id: dict[str, dict] = {}
    for extracted in req.skills:
        skill_id = str(extracted.get("skill_id", "")).strip()
        skill = skills_by_id.get(skill_id)
        if not skill:
            continue

        raw_proficiency = extracted.get("proficiency")
        try:
            proficiency = max(0, min(100, int(raw_proficiency)))
        except (TypeError, ValueError):
            proficiency = None

        raw_confidence = extracted.get("confidence")
        try:
            confidence = max(0.0, min(1.0, float(raw_confidence)))
        except (TypeError, ValueError):
            confidence = None

        resume_nodes_by_id[skill_id] = {
            "id": skill_id,
            "label": skill.get("name", skill_id.replace("_", " ").title()),
            "category": skill.get("category", "unknown"),
            "in_resume": True,
            "proficiency": proficiency,
            "confidence": confidence,
            "evidence": str(extracted.get("evidence", ""))[:240],
        }

    if not resume_nodes_by_id:
        raise HTTPException(status_code=400, detail="No extracted skills matched the skill taxonomy. Analyze the resume again.")

    resume_skill_ids = set(resume_nodes_by_id)
    focus_id = max(
        resume_skill_ids,
        key=lambda skill_id: resume_nodes_by_id[skill_id]["proficiency"] or 0,
    )

    # Keep the canvas focused on one skill's direct neighborhood. The complete
    # resume inventory is returned separately for the UI's selectable skill list.
    focus_skill = skills_by_id[focus_id]
    prerequisite_ids = set(focus_skill.get("prerequisites", [])) - {focus_id}
    related_ids = set(focus_skill.get("related", [])) - prerequisite_ids - {focus_id}
    neighbor_ids = (prerequisite_ids | related_ids) & skills_by_id.keys()

    nodes = []
    for neighbor_id in neighbor_ids:
        taxonomy_skill = skills_by_id[neighbor_id]
        profile_data = resume_nodes_by_id.get(neighbor_id, {})
        nodes.append({
            "id": neighbor_id,
            "label": taxonomy_skill.get("name", neighbor_id.replace("_", " ").title()),
            "category": taxonomy_skill.get("category", "unknown"),
            "in_resume": neighbor_id in resume_skill_ids,
            "proficiency": profile_data.get("proficiency"),
            "confidence": profile_data.get("confidence"),
            "evidence": profile_data.get("evidence", ""),
        })
    nodes.sort(key=lambda node: (node["label"].casefold(), node["id"]))

    edges = [
        {"source": prerequisite_id, "target": focus_id, "type": "prerequisite"}
        for prerequisite_id in prerequisite_ids
        if prerequisite_id in skills_by_id
    ]
    edges.extend(
        {"source": focus_id, "target": related_id, "type": "related"}
        for related_id in related_ids
        if related_id in skills_by_id
    )
    edges.sort(key=lambda edge: (edge["type"], edge["source"], edge["target"]))

    resume_skills = sorted(
        resume_nodes_by_id.values(),
        key=lambda node: (node["label"].casefold(), node["id"]),
    )

    return {
        "center": resume_nodes_by_id[focus_id],
        "nodes": nodes,
        "edges": edges,
        "resume_skills": resume_skills,
    }


@app.get("/api/graph/{skill_id}")
def api_get_skill_graph(skill_id: str):
    """
    Returns the network graph data for a specific skill, including its prerequisites
    and related skills from the taxonomy. Relationship direction and type are kept
    explicit so the UI can distinguish prerequisites from adjacent skills.
    """
    from shared.services.gap_analyzer import _load_taxonomy

    taxonomy = _load_taxonomy()
    skills = taxonomy.get("skills", [])
    skills_by_id = {skill.get("id"): skill for skill in skills if skill.get("id")}
    center_skill = skills_by_id.get(skill_id)
    if not center_skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    prerequisite_ids = set(center_skill.get("prerequisites", [])) - {skill_id}
    related_ids = set(center_skill.get("related", [])) - prerequisite_ids - {skill_id}
    neighbor_ids = (prerequisite_ids | related_ids) & skills_by_id.keys()

    nodes = [
        {
            "id": neighbor_id,
            "label": skills_by_id[neighbor_id].get("name", neighbor_id.replace("_", " ").title()),
            "category": skills_by_id[neighbor_id].get("category", "unknown"),
        }
        for neighbor_id in neighbor_ids
    ]
    nodes.sort(key=lambda node: (node["label"].casefold(), node["id"]))

    edges = [
        {"source": prerequisite_id, "target": skill_id, "type": "prerequisite"}
        for prerequisite_id in prerequisite_ids
        if prerequisite_id in skills_by_id
    ]
    edges.extend(
        {"source": skill_id, "target": related_id, "type": "related"}
        for related_id in related_ids
        if related_id in skills_by_id
    )
    edges.sort(key=lambda edge: (edge["type"], edge["source"], edge["target"]))

    return {
        "center": {
            "id": center_skill["id"],
            "label": center_skill["name"],
            "category": center_skill.get("category", "unknown"),
        },
        "nodes": nodes,
        "edges": edges,
    }


# ============================================================
# Run Server
# ============================================================
if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  SKILLGRAPH BHARAT API SERVER")
    print("  Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
