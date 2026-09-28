"""
SkillGraph Bharat - Main API Server

Run with: uvicorn main:app --reload --port 8000
Docs at:  http://localhost:8000/docs
"""
import sys
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Add project root to path so shared imports work
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from shared.nlp.skill_extractor import extract_skills
from shared.services.gap_analyzer import compute_gap, get_available_roles

# ============================================================
# App Setup
# ============================================================
app = FastAPI(
    title="SkillGraph Bharat API",
    description="AI-Powered Workforce Intelligence & Skill Gap Platform",
    version="1.0.0"
)

# Allow frontend to connect from any origin during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    Currently supports .txt files. PDF support coming soon.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
    
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    
    if len(text.strip()) < 10:
        raise HTTPException(status_code=400, detail="File content too short or unreadable.")
    
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
# Run Server
# ============================================================
if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  SKILLGRAPH BHARAT API SERVER")
    print("  Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
