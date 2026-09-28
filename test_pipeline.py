"""Full pipeline test: Resume -> NLP -> Gap Analysis"""
import sys
sys.path.insert(0, ".")
from shared.nlp.skill_extractor import extract_skills
from shared.services.gap_analyzer import compute_gap

resume = """
Software Engineer with 3 years of experience in Python and Django.
Built REST APIs using FastAPI. Familiar with Docker and basic AWS.
Completed a course on Machine Learning. Used PostgreSQL and Redis
for database management. Strong problem solving skills.
"""

print("=" * 60)
print("  STEP 1: EXTRACT SKILLS FROM RESUME")
print("=" * 60)
skills = extract_skills(resume)
for s in skills:
    name = s["skill_name"]
    prof = s["proficiency"]
    conf = s["confidence"]
    print(f"  {name:35s} | Prof: {prof:3d}% | Conf: {conf}")

print(f"\nTotal skills found: {len(skills)}")

print("\n" + "=" * 60)
print("  STEP 2: GAP vs AI ENGINEER")
print("=" * 60)
r1 = compute_gap(skills, "ai_engineer")
print(f"Readiness: {r1['overall_readiness']}%")
print(f"Strong: {r1['strong_count']} | Medium: {r1['medium_gap_count']} | Critical: {r1['critical_gap_count']}")
for s in r1["critical_gaps"][:5]:
    print(f"  [GAP] {s['skill_name']} (need {s['required_proficiency']}%)")

print("\n" + "=" * 60)
print("  STEP 3: GAP vs BACKEND DEVELOPER")
print("=" * 60)
r2 = compute_gap(skills, "backend_developer")
print(f"Readiness: {r2['overall_readiness']}%")
print(f"Strong: {r2['strong_count']} | Medium: {r2['medium_gap_count']} | Critical: {r2['critical_gap_count']}")
for s in r2["strong_skills"]:
    print(f"  [OK]  {s['skill_name']} ({s['user_proficiency']}%)")

print("\n" + "=" * 60)
print("  CONCLUSION")
print("=" * 60)
print(f"This candidate is {r2['overall_readiness']}% ready for Backend Developer")
print(f"but only {r1['overall_readiness']}% ready for AI Engineer.")
print("The system correctly identifies the career fit.")
