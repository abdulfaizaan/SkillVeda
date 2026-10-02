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
    Estimates proficiency based on context clues near all mentions of the skill,
    and boosts score based on frequency of mentions.
    Returns (proficiency_score, evidence_string).
    """
    escaped_skill = re.escape(skill_word)
    # Find all occurrences of the skill
    pattern = re.compile(r'\b' + escaped_skill + r'\b', re.IGNORECASE)
    matches = list(pattern.finditer(text))
    
    if not matches:
        return 50, f"Mentioned {skill_word}"
        
    best_prof = 50
    best_context = f"Mentioned {skill_word}"
    
    for match in matches:
        # Extract 80 characters before and after for robust context, replace newlines with space
        start_idx = max(0, match.start() - 80)
        end_idx = min(len(text), match.end() + 80)
        context = text[start_idx:end_idx].replace('\n', ' ').strip()
        context_lower = context.lower()
        
        prof = 50 # Default
        
        # 1. Explicit years or mastery
        if re.search(r'\b(5\+? years?|expert|advanced|master|led)\b', context_lower):
            prof = 90
        elif re.search(r'\b(2-4 years?|2 years?|3 years?|4 years?|proficient|strong)\b', context_lower):
            prof = 75
        elif re.search(r'\b(1 year|familiar|basic|beginner)\b', context_lower):
            prof = 35
        # 2. Action verbs indicating applied experience (Projects / Work)
        elif re.search(r'\b(built|developed|implemented|designed|created|architected|deployed)\b', context_lower):
            prof = 80
        elif re.search(r'\b(used|utilized|worked with|applied|performed)\b', context_lower):
            prof = 65
        # 3. Learning indicators
        elif re.search(r'\b(learned|course|certification|specialization)\b', context_lower):
            prof = 55
            
        if prof > best_prof:
            best_prof = prof
            best_context = context

    # Frequency Boost: +5 proficiency for every extra time it's mentioned (max +15)
    frequency_boost = min((len(matches) - 1) * 5, 15)
    
    final_prof = min(best_prof + frequency_boost, 95)
    
    return final_prof, best_context

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
    single_word_terms = [
        term for term in _ALL_SKILL_NAMES_AND_ALIASES
        if re.fullmatch(r"[a-z0-9]+", term)
    ]
    ambiguous_fuzzy_words = {"learning"}
    
    for word in words:
        # If word is very short, skip fuzzy matching
        if len(word) < 4 or word in ambiguous_fuzzy_words:
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
