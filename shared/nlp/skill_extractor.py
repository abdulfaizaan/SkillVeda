import json
import re
import difflib
from pathlib import Path
from typing import List, Dict, Any, Optional

def _load_taxonomy() -> List[Dict[str, Any]]:
    """
    Loads the skill taxonomy from shared/data/skill_taxonomy.json.
    """
    # Path relative to this script: shared/nlp/skill_extractor.py -> shared/data/skill_taxonomy.json
    base_dir = Path(__file__).resolve().parent.parent
    taxonomy_path = base_dir / "data" / "skill_taxonomy.json"
    
    if not taxonomy_path.exists():
        return []
    
    with open(taxonomy_path, "r", encoding="utf-8") as f:
        return json.load(f)

# Global variables to cache taxonomy data
_TAXONOMY = []
_SKILL_ID_MAP = {}
_ALL_SKILL_NAMES_AND_ALIASES = {} # map lowercase name -> (skill_id, is_primary)

def _initialize():
    global _TAXONOMY, _SKILL_ID_MAP, _ALL_SKILL_NAMES_AND_ALIASES
    if _TAXONOMY:
        return
    raw = _load_taxonomy()
    # Handle both formats: flat list or dict with "skills" key
    if isinstance(raw, dict):
        _TAXONOMY = raw.get("skills", [])
    else:
        _TAXONOMY = raw
    for skill in _TAXONOMY:
        sid = skill["id"]
        _SKILL_ID_MAP[sid] = skill
        _ALL_SKILL_NAMES_AND_ALIASES[skill["name"].lower()] = (sid, True)
        for alias in skill.get("aliases", []):
            _ALL_SKILL_NAMES_AND_ALIASES[alias.lower()] = (sid, False)

def _estimate_proficiency_and_context(text: str, skill_word: str) -> tuple[int, str]:
    """
    Estimates proficiency based on context clues near the skill mention.
    Returns (proficiency_score, evidence_string).
    """
    # Create a regex to find the skill and grab surrounding text (up to 40 chars before and after)
    # Using re.escape for the skill word.
    escaped_skill = re.escape(skill_word)
    pattern = re.compile(r'(.{0,40})\b' + escaped_skill + r'\b(.{0,40})', re.IGNORECASE)
    
    match = pattern.search(text)
    if not match:
        return 50, f"Mentioned {skill_word}"
        
    before_ctx, after_ctx = match.groups()
    context = (before_ctx + skill_word + after_ctx).strip()
    context_lower = context.lower()
    
    # Check for proficiency indicators
    if re.search(r'\b(5\+? years?|expert|advanced|led)\b', context_lower):
        return 90, context
    elif re.search(r'\b(2-4 years?|2 years?|3 years?|4 years?|proficient|strong)\b', context_lower):
        return 70, context
    elif re.search(r'\b(1 year|familiar|basic|beginner)\b', context_lower):
        return 30, context
    elif re.search(r'\b(learned|course|certification)\b', context_lower):
        return 40, context
        
    return 50, context

def extract_skills(text: str) -> List[Dict[str, Any]]:
    """
    Extracts skills from unstructured text using exact matching, fuzzy matching,
    and context detection. Returns a list of dictionaries with skill details.
    """
    if not text or not text.strip():
        return []
        
    _initialize()
    if not _TAXONOMY:
        return []
        
    text_lower = text.lower()
    extracted_skills_map = {} # skill_id -> best_extraction_dict
    
    # Tokenize words roughly for fuzzy matching
    words = re.findall(r'\b\w+\b', text_lower)
    
    def add_or_update_skill(sid: str, confidence: float, match_term: str):
        prof, evidence = _estimate_proficiency_and_context(text, match_term)
        skill_data = _SKILL_ID_MAP[sid]
        
        result = {
            "skill_id": sid,
            "skill_name": skill_data["name"],
            "category": skill_data.get("category", "unknown"),
            "proficiency": prof,
            "confidence": confidence,
            "evidence": evidence
        }
        
        # Deduplicate: Keep highest proficiency
        if sid in extracted_skills_map:
            existing = extracted_skills_map[sid]
            if prof > existing["proficiency"] or (prof == existing["proficiency"] and confidence > existing["confidence"]):
                extracted_skills_map[sid] = result
        else:
            extracted_skills_map[sid] = result

    # 1. EXACT MATCH & CONTEXT DETECTION
    # We will search for all known skill names and aliases in the text.
    for term, (sid, is_primary) in _ALL_SKILL_NAMES_AND_ALIASES.items():
        # Word boundary check for exact match
        escaped_term = re.escape(term)
        if re.search(r'\b' + escaped_term + r'\b', text_lower):
            # Exact match found
            confidence = 0.95 if is_primary else 0.90
            add_or_update_skill(sid, confidence, term)

    # 2. FUZZY MATCH
    # Find potential misspellings for terms not already found, or just process words
    # We will only fuzzy match single-word skills or individual words against single-word skills to avoid massive overhead
    single_word_terms = [t for t in _ALL_SKILL_NAMES_AND_ALIASES.keys() if " " not in t]
    
    for word in words:
        # If word is very short, skip fuzzy matching
        if len(word) < 4:
            continue
            
        # Check if we already have this word perfectly
        if word in _ALL_SKILL_NAMES_AND_ALIASES:
            continue
            
        matches = difflib.get_close_matches(word, single_word_terms, n=1, cutoff=0.8)
        if matches:
            best_match = matches[0]
            sid, is_primary = _ALL_SKILL_NAMES_AND_ALIASES[best_match]
            
            # If we haven't found this skill via exact match, add it via fuzzy
            if sid not in extracted_skills_map:
                add_or_update_skill(sid, 0.70, word)

    # Finalize list and sort by confidence descending
    results = list(extracted_skills_map.values())
    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results

def extract_skills_from_file(filepath: str) -> List[Dict[str, Any]]:
    """
    Reads a file and extracts skills.
    Supports basic text files. For PDFs, currently extracts basic text if possible,
    but relying on stdlib means PDF parsing is limited.
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {filepath}")
        
    # Read text
    text = ""
    try:
        if path.suffix.lower() == '.pdf':
            # Stub for PDF - since only stdlib is allowed, we just read raw bytes
            # and extract printable characters, which is very crude but meets constraints.
            with open(path, "rb") as f:
                content = f.read().decode('latin-1')
                # Extract simple ascii text roughly
                text = " ".join(re.findall(r'[a-zA-Z0-9.,;:\-\s]+', content))
        else:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
    except Exception as e:
        print(f"Warning: Could not read file properly - {e}")
        return []
        
    return extract_skills(text)

if __name__ == "__main__":
    # Demo
    sample_text = (
        "I am a software engineer with 5+ years of experience in Python. "
        "I am also proficient in SQL and have basic knowledge of machine learning algorithms. "
        "I have worked with Javva and Py in various projects."
    )
    print("Extracting skills from sample text...")
    print(f"Text: '{sample_text}'\n")
    
    skills = extract_skills(sample_text)
    print(json.dumps(skills, indent=2))
