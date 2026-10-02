from pathlib import Path
import json
import sys
sys.path.insert(0, str(Path().resolve()))
from shared.nlp.skill_extractor import extract_skills_from_file
import glob

pdf_files = glob.glob(r'C:\Users\bhati\.gemini\antigravity\brain\8c964bef-d157-4daf-b9e1-75aa5b376f1e\.user_uploaded\*.pdf')
if not pdf_files:
    print('No pdfs found')
    sys.exit(0)

latest_pdf = max(pdf_files, key=lambda f: Path(f).stat().st_mtime)
print(f'Testing on {latest_pdf}')
skills = extract_skills_from_file(latest_pdf)
for s in skills:
    if s['skill_name'] in ['Python', 'PySpark', 'FastAPI']:
        print(f\"{s['skill_name']}: {s['proficiency']}% | Evidence: {repr(s['evidence'][:80])}\")
