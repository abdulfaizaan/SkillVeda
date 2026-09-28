# SkillGraph Bharat

**AI-Powered Workforce Intelligence & Skill Gap Platform**

> Bridging the information asymmetry between India's Students, Employers, and Institutions.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start the API server
python main.py

# 3. Open docs
# http://localhost:8000/docs
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/extract-skills` | POST | Extract skills from any text (resume/JD/syllabus) |
| `/api/gap-analysis` | POST | Full pipeline: text -> skills -> gap report |
| `/api/roles` | GET | List all available roles |
| `/api/roles/{id}/requirements` | GET | Get required skills for a role |
| `/api/employer/analyze-jd` | POST | Analyze a job description |
| `/api/institution/analyze-syllabus` | POST | Analyze a university syllabus |

## Project Structure

```
skillgraph-bharat/
├── main.py                    # FastAPI server
├── shared/                    # Shared engine (DO NOT MODIFY after Day 1)
│   ├── nlp/
│   │   └── skill_extractor.py # Custom NLP skill extraction
│   ├── graph/
│   │   ├── connection.py      # Neo4j wrapper
│   │   └── seed.py            # Graph seeder
│   ├── services/
│   │   └── gap_analyzer.py    # Gap analysis algorithm
│   └── data/
│       └── skill_taxonomy.json # 291 skills, 18 roles
├── student/                   # Person A's portal
├── employer/                  # Person B's portal
├── institution/               # Person C's portal
└── frontend/                  # Next.js app
```

## Team

Built for **Build For Bharat 2026**.
