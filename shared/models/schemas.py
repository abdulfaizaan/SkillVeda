from pydantic import BaseModel
from typing import List, Optional

class Skill(BaseModel):
    name: str
    category: str
    proficiency_score: int = 0
    demand_percentage: Optional[float] = None
    is_verified: bool = False

class GapReport(BaseModel):
    target_role: str
    strong_skills: List[Skill]
    medium_gaps: List[Skill]
    critical_gaps: List[Skill]
    
class CourseRecommendation(BaseModel):
    title: str
    provider: str
    skills_taught: List[str]
    duration_weeks: int
    url: Optional[str] = None
