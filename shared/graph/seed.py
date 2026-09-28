"""
Graph Seeder Module for SkillGraph Bharat.

Loads the skill taxonomy from shared/data/skill_taxonomy.json, establishes standard
IT and engineering roles, and populates Neo4j with:
  - (:Skill {id, name, category, demand_weight})
  - (:Role {id, title})
  - (:Role)-[:REQUIRES {proficiency_required}]->(:Skill)
  - (:Skill)-[:PREREQUISITE_OF]->(:Skill)
  - (:Skill)-[:RELATED_TO]->(:Skill)

Clears existing data beforehand to guarantee idempotent seeding.
Can be executed as a standalone script or imported as a module function.
"""

import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Configure sys.path so the module can run standalone: python seed.py
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from neo4j.exceptions import AuthError, Neo4jError, ServiceUnavailable

try:
    from shared.graph.connection import GraphDB
except ImportError:
    from connection import GraphDB  # type: ignore

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Base directory paths
BASE_DIR = Path(__file__).resolve().parent.parent
TAXONOMY_PATH = BASE_DIR / "data" / "skill_taxonomy.json"

# 15 Curated Industry Roles
ROLES: List[Dict[str, str]] = [
    {"id": "full_stack_developer", "title": "Full Stack Developer"},
    {"id": "backend_engineer", "title": "Backend Engineer"},
    {"id": "frontend_engineer", "title": "Frontend Engineer"},
    {"id": "data_scientist", "title": "Data Scientist"},
    {"id": "ml_engineer", "title": "Machine Learning Engineer"},
    {"id": "data_engineer", "title": "Data Engineer"},
    {"id": "devops_engineer", "title": "DevOps / SRE Engineer"},
    {"id": "cloud_architect", "title": "Cloud Solutions Architect"},
    {"id": "cybersecurity_analyst", "title": "Cybersecurity Analyst"},
    {"id": "android_developer", "title": "Android Developer"},
    {"id": "ios_developer", "title": "iOS Developer"},
    {"id": "ai_llm_engineer", "title": "AI / LLM Engineer"},
    {"id": "qa_automation_engineer", "title": "QA / Automation Engineer"},
    {"id": "product_manager", "title": "Technical Product Manager"},
    {"id": "embedded_systems_engineer", "title": "Embedded Systems Engineer"},
]

# Role Requirements (260 mappings: Role REQUIRES Skill with proficiency_required)
ROLE_REQUIREMENTS: Dict[str, List[tuple]] = {
    "full_stack_developer": [
        ("javascript", 85), ("typescript", 80), ("react", 85), ("nodejs", 85),
        ("expressjs", 80), ("html5", 90), ("css3", 85), ("tailwind_css", 80),
        ("postgresql", 80), ("mongodb", 75), ("redis", 70), ("git", 85),
        ("rest_apis", 90), ("docker", 75), ("unit_testing", 80), ("ci_cd", 70),
        ("system_design", 75), ("problem_solving", 85),
    ],
    "backend_engineer": [
        ("python", 90), ("java", 85), ("go", 75), ("postgresql", 85),
        ("redis", 80), ("fastapi", 85), ("spring_boot", 80), ("rest_apis", 95),
        ("grpc", 75), ("microservices", 85), ("system_design", 85), ("git", 90),
        ("docker", 80), ("sql", 90), ("oop", 90), ("data_structures", 85),
        ("unit_testing", 85), ("concurrency", 80),
    ],
    "frontend_engineer": [
        ("javascript", 95), ("typescript", 90), ("react", 95), ("nextjs", 85),
        ("vuejs", 75), ("html5", 95), ("css3", 95), ("tailwind_css", 90),
        ("redux", 85), ("material_ui", 80), ("jest", 80), ("git", 85),
        ("rest_apis", 85), ("graphql", 75), ("websockets", 70), ("accessibility_testing", 75),
        ("clean_code", 80), ("mobile_ui_ux", 75),
    ],
    "data_scientist": [
        ("python", 95), ("r_lang", 75), ("sql", 90), ("pandas", 95),
        ("numpy", 90), ("scipy", 80), ("scikit_learn", 90), ("machine_learning", 90),
        ("deep_learning", 80), ("data_analysis", 95), ("data_modeling", 85), ("tableau", 80),
        ("power_bi", 75), ("xgboost", 85), ("nlp", 80), ("problem_solving", 90),
        ("data_storytelling", 85),
    ],
    "ml_engineer": [
        ("python", 95), ("pytorch", 90), ("tensorflow", 85), ("scikit_learn", 90),
        ("machine_learning", 95), ("deep_learning", 90), ("mlops", 85), ("mlflow", 80),
        ("docker", 80), ("kubernetes", 75), ("fastapi", 80), ("sql", 85),
        ("data_structures", 85), ("system_design", 80), ("dvc", 75), ("fine_tuning", 80),
        ("onnx", 75),
    ],
    "data_engineer": [
        ("python", 90), ("sql", 95), ("apache_spark", 90), ("apache_kafka", 85),
        ("apache_airflow", 85), ("databricks", 80), ("dbt", 80), ("etl_pipeline", 95),
        ("data_warehousing", 90), ("data_modeling", 85), ("snowflake", 85), ("postgresql", 85),
        ("docker", 75), ("aws", 80), ("delta_lake", 80), ("git", 85),
        ("data_governance", 75),
    ],
    "devops_engineer": [
        ("linux_admin", 95), ("shell_scripting", 90), ("docker", 95), ("kubernetes", 90),
        ("terraform", 85), ("ansible", 80), ("aws", 85), ("ci_cd", 95),
        ("github_actions", 85), ("jenkins", 80), ("prometheus", 85), ("grafana", 85),
        ("helm", 80), ("nginx", 80), ("git", 90), ("site_reliability", 85),
        ("argocd", 80), ("vault", 75),
    ],
    "cloud_architect": [
        ("aws", 95), ("azure", 85), ("gcp", 80), ("kubernetes", 90),
        ("terraform", 85), ("system_design", 95), ("microservices", 90), ("cloud_security", 85),
        ("serverless", 85), ("scalability", 95), ("fault_tolerance", 90), ("network_security", 85),
        ("cost_optimization", 85), ("docker", 85), ("ci_cd", 80),
        ("iam", 85), ("apache_kafka", 80), ("stakeholder_management", 85),
    ],
    "cybersecurity_analyst": [
        ("network_security", 90), ("penetration_testing", 85), ("cryptography", 80), ("owasp_top_10", 90),
        ("siem", 85), ("soc_analysis", 85), ("vulnerability_management", 85), ("iam", 80),
        ("wireshark", 80), ("burp_suite", 85), ("zero_trust", 80), ("cloud_security", 85),
        ("threat_intelligence", 80), ("compliance_frameworks", 80), ("api_security", 85), ("devsecops", 80),
        ("linux_admin", 80), ("shell_scripting", 75),
    ],
    "android_developer": [
        ("kotlin", 95), ("java", 85), ("android_development", 95), ("jetpack_compose", 90),
        ("android_studio", 90), ("rest_apis", 85), ("sqlite", 80), ("git", 85),
        ("mobile_ui_ux", 80), ("app_store_optimization", 75), ("unit_testing", 80), ("clean_code", 85),
        ("oop", 90), ("data_structures", 80), ("mobile_security", 75), ("offline_first_mobile", 80),
        ("problem_solving", 80),
    ],
    "ios_developer": [
        ("swift", 95), ("objective_c", 70), ("ios_development", 95), ("swiftui", 90),
        ("xcode", 90), ("rest_apis", 85), ("git", 85), ("mobile_ui_ux", 85),
        ("app_store_optimization", 75), ("unit_testing", 80), ("clean_code", 85), ("oop", 85),
        ("data_structures", 80), ("mobile_security", 75), ("offline_first_mobile", 80), ("problem_solving", 80),
        ("concurrency", 80),
    ],
    "ai_llm_engineer": [
        ("python", 95), ("pytorch", 90), ("nlp", 90), ("generative_ai", 95),
        ("large_language_models", 95), ("prompt_engineering", 90), ("rag", 95), ("langchain", 90),
        ("llamaindex", 85), ("vector_embeddings", 90), ("qdrant", 80), ("chromadb", 80),
        ("fine_tuning", 85), ("fastapi", 85), ("docker", 80), ("hugging_face", 90),
        ("mlops", 80),
    ],
    "qa_automation_engineer": [
        ("python", 85), ("javascript", 80), ("selenium", 90), ("cypress", 85),
        ("playwright", 90), ("pytest", 85), ("postman", 90), ("jmeter", 80),
        ("test_automation", 95), ("manual_testing", 85), ("unit_testing", 85), ("integration_testing", 90),
        ("git", 85), ("ci_cd", 80), ("cucumber_bdd", 80), ("api_design", 75),
        ("accessibility_testing", 75),
    ],
    "product_manager": [
        ("product_management", 95), ("agile_scrum", 90), ("technical_writing", 85), ("problem_solving", 90),
        ("communication", 95), ("leadership", 85), ("project_management", 85), ("figma", 80),
        ("user_research", 85), ("stakeholder_management", 90), ("ab_testing", 85), ("business_analysis", 90),
        ("data_analysis", 80), ("scrum_master", 80), ("jira", 85), ("data_storytelling", 85),
    ],
    "embedded_systems_engineer": [
        ("c", 95), ("cpp", 90), ("embedded_c", 95), ("rtos", 90),
        ("arm_cortex", 85), ("microcontrollers", 90), ("linux_device_drivers", 85), ("can_bus", 80),
        ("i2c_spi_uart", 85), ("firmware_development", 90), ("iot", 80), ("arduino", 75),
        ("raspberry_pi", 75), ("hardware_debugging", 85), ("git", 80), ("linux_admin", 80),
        ("ble_bluetooth", 75),
    ],
}

# 70 Prerequisite Relationships: (from_skill)-[:PREREQUISITE_OF]->(to_skill)
PREREQUISITES: List[tuple] = [
    ("python", "django"),
    ("python", "fastapi"),
    ("python", "flask"),
    ("python", "pandas"),
    ("python", "numpy"),
    ("python", "scikit_learn"),
    ("python", "pytorch"),
    ("python", "tensorflow"),
    ("python", "apache_airflow"),
    ("javascript", "typescript"),
    ("javascript", "react"),
    ("javascript", "vuejs"),
    ("javascript", "nodejs"),
    ("javascript", "expressjs"),
    ("javascript", "nextjs"),
    ("typescript", "nestjs"),
    ("java", "spring_boot"),
    ("csharp", "aspnet_core"),
    ("c", "cpp"),
    ("c", "embedded_c"),
    ("kotlin", "android_development"),
    ("swift", "ios_development"),
    ("dart", "flutter"),
    ("html5", "react"),
    ("html5", "css3"),
    ("css3", "sass"),
    ("css3", "tailwind_css"),
    ("sql", "postgresql"),
    ("sql", "mysql"),
    ("sql", "data_warehousing"),
    ("sql", "etl_pipeline"),
    ("sql", "snowflake"),
    ("sql", "dbt"),
    ("data_structures", "system_design"),
    ("oop", "design_patterns"),
    ("oop", "clean_code"),
    ("git", "ci_cd"),
    ("linux_admin", "docker"),
    ("docker", "kubernetes"),
    ("docker", "helm"),
    ("docker", "argocd"),
    ("docker", "openshift"),
    ("machine_learning", "deep_learning"),
    ("machine_learning", "mlops"),
    ("deep_learning", "large_language_models"),
    ("deep_learning", "computer_vision"),
    ("deep_learning", "nlp"),
    ("nlp", "large_language_models"),
    ("large_language_models", "prompt_engineering"),
    ("large_language_models", "rag"),
    ("large_language_models", "fine_tuning"),
    ("vector_embeddings", "rag"),
    ("vector_embeddings", "qdrant"),
    ("vector_embeddings", "chromadb"),
    ("langchain", "rag"),
    ("rest_apis", "grpc"),
    ("rest_apis", "graphql"),
    ("rest_apis", "api_security"),
    ("microservices", "istio"),
    ("microservices", "event_driven_architecture"),
    ("unit_testing", "tdd"),
    ("unit_testing", "integration_testing"),
    ("manual_testing", "test_automation"),
    ("test_automation", "selenium"),
    ("test_automation", "cypress"),
    ("test_automation", "playwright"),
    ("network_security", "penetration_testing"),
    ("network_security", "siem"),
    ("owasp_top_10", "penetration_testing"),
    ("embedded_c", "rtos"),
]

# 70 Related Relationships: (skill1)-[:RELATED_TO]->(skill2)
RELATED_SKILLS: List[tuple] = [
    ("react", "vuejs"),
    ("react", "angular"),
    ("vuejs", "svelte"),
    ("fastapi", "flask"),
    ("fastapi", "django"),
    ("django", "ruby_on_rails"),
    ("spring_boot", "aspnet_core"),
    ("expressjs", "nestjs"),
    ("postgresql", "mysql"),
    ("postgresql", "mariadb"),
    ("mongodb", "couchbase"),
    ("redis", "postgresql"),
    ("snowflake", "bigquery"),
    ("apache_spark", "apache_flink"),
    ("apache_kafka", "apache_spark"),
    ("apache_airflow", "prefect"),
    ("tableau", "power_bi"),
    ("tableau", "looker"),
    ("power_bi", "looker"),
    ("aws", "azure"),
    ("aws", "gcp"),
    ("azure", "gcp"),
    ("docker", "kubernetes"),
    ("terraform", "cloudformation"),
    ("jenkins", "gitlab_ci"),
    ("jenkins", "github_actions"),
    ("github_actions", "gitlab_ci"),
    ("prometheus", "datadog"),
    ("grafana", "datadog"),
    ("splunk", "datadog"),
    ("elasticsearch", "meilisearch"),
    ("pytorch", "tensorflow"),
    ("pytorch", "keras"),
    ("tensorflow", "keras"),
    ("hugging_face", "langchain"),
    ("langchain", "llamaindex"),
    ("chromadb", "pinecone"),
    ("chromadb", "weaviate"),
    ("pinecone", "qdrant"),
    ("weaviate", "qdrant"),
    ("scikit_learn", "xgboost"),
    ("scikit_learn", "lightgbm"),
    ("xgboost", "lightgbm"),
    ("pandas", "numpy"),
    ("numpy", "scipy"),
    ("spacy", "nltk"),
    ("mlflow", "weights_and_biases"),
    ("mlflow", "kubeflow"),
    ("selenium", "cypress"),
    ("cypress", "playwright"),
    ("selenium", "playwright"),
    ("postman", "jmeter"),
    ("jmeter", "k6"),
    ("jmeter", "locust"),
    ("pytest", "jest"),
    ("kotlin", "swift"),
    ("flutter", "react_native"),
    ("jetpack_compose", "swiftui"),
    ("burp_suite", "owasp_top_10"),
    ("wireshark", "network_security"),
    ("siem", "soc_analysis"),
    ("sonarqube", "snyk"),
    ("c", "cpp"),
    ("c", "rust"),
    ("go", "rust"),
    ("embedded_c", "microcontrollers"),
    ("arduino", "raspberry_pi"),
    ("figma", "mobile_ui_ux"),
    ("product_management", "project_management"),
    ("agile_scrum", "jira"),
]


def load_taxonomy(taxonomy_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """
    Loads skill taxonomy from shared/data/skill_taxonomy.json.

    Args:
        taxonomy_path: Optional custom path to taxonomy JSON.

    Returns:
        List of dictionaries with skill definitions.

    Raises:
        FileNotFoundError: If the taxonomy JSON file is not found.
    """
    path = taxonomy_path or TAXONOMY_PATH
    if not path.exists():
        raise FileNotFoundError(f"Taxonomy file not found at: {path}")

    with open(path, "r", encoding="utf-8") as f:
        skills = json.load(f)

    return skills


def seed_graph(
    db: Optional[GraphDB] = None,
    taxonomy_path: Optional[Path] = None,
) -> Dict[str, int]:
    """
    Clears existing graph data and seeds skills, roles, and relationships.

    Args:
        db: Optional GraphDB instance. If not provided, a new instance is created.
        taxonomy_path: Optional custom path to skill_taxonomy.json.

    Returns:
        Dictionary containing counts of seeded entities and relationships.
    """
    should_close_db = False
    if db is None:
        db = GraphDB()
        should_close_db = True

    try:
        # 1. Load taxonomy
        skills = load_taxonomy(taxonomy_path)

        # 2. Clear existing graph data (idempotent)
        db.query("MATCH (n) DETACH DELETE n")

        # 3. Create uniqueness constraints for fast indexed lookups
        try:
            db.query("CREATE CONSTRAINT skill_id_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE")
            db.query("CREATE CONSTRAINT role_id_unique IF NOT EXISTS FOR (r:Role) REQUIRE r.id IS UNIQUE")
        except Exception as exc:
            logger.debug("Constraint creation notice: %s", exc)

        # 4. Seed Skills
        skills_payload = [
            {
                "id": s["id"],
                "name": s["name"],
                "category": s.get("category", "general"),
                "demand_weight": float(s.get("demand_weight", 0.5)),
            }
            for s in skills
        ]
        db.query(
            """
            UNWIND $skills AS s
            CREATE (:Skill {
                id: s.id,
                name: s.name,
                category: s.category,
                demand_weight: s.demand_weight
            })
            """,
            {"skills": skills_payload},
        )

        # 5. Seed Roles
        db.query(
            """
            UNWIND $roles AS r
            CREATE (:Role {
                id: r.id,
                title: r.title
            })
            """,
            {"roles": ROLES},
        )

        # 6. Create Relationships
        # Flatten role requirements
        requires_payload = []
        for role_id, skill_list in ROLE_REQUIREMENTS.items():
            for skill_id, prof in skill_list:
                requires_payload.append({
                    "role_id": role_id,
                    "skill_id": skill_id,
                    "proficiency_required": prof,
                })

        db.query(
            """
            UNWIND $requires AS req
            MATCH (r:Role {id: req.role_id})
            MATCH (s:Skill {id: req.skill_id})
            CREATE (r)-[:REQUIRES {proficiency_required: req.proficiency_required}]->(s)
            """,
            {"requires": requires_payload},
        )

        # Prerequisites: (:Skill)-[:PREREQUISITE_OF]->(:Skill)
        prereqs_payload = [{"from_id": f, "to_id": t} for f, t in PREREQUISITES]
        db.query(
            """
            UNWIND $prereqs AS p
            MATCH (s1:Skill {id: p.from_id})
            MATCH (s2:Skill {id: p.to_id})
            CREATE (s1)-[:PREREQUISITE_OF]->(s2)
            """,
            {"prereqs": prereqs_payload},
        )

        # Related skills: (:Skill)-[:RELATED_TO]->(:Skill)
        related_payload = [{"from_id": f, "to_id": t} for f, t in RELATED_SKILLS]
        db.query(
            """
            UNWIND $related AS rel
            MATCH (s1:Skill {id: rel.from_id})
            MATCH (s2:Skill {id: rel.to_id})
            CREATE (s1)-[:RELATED_TO]->(s2)
            """,
            {"related": related_payload},
        )

        total_relationships = (
            len(requires_payload) + len(prereqs_payload) + len(related_payload)
        )

        # Progress output matching the requested specification:
        progress_msg = (
            f"Seeding {len(skills)} skills... Done. "
            f"Seeding {len(ROLES)} roles... Done. "
            f"Creating {total_relationships} relationships... Done."
        )
        print(progress_msg)

        return {
            "skills": len(skills),
            "roles": len(ROLES),
            "relationships": total_relationships,
        }

    finally:
        if should_close_db:
            db.close()


def main() -> None:
    """Standalone entrypoint for running python seed.py."""
    try:
        seed_graph()
    except (ServiceUnavailable, ConnectionRefusedError) as exc:
        print(f"Error: Unable to connect to Neo4j database ({exc}).", file=sys.stderr)
        print("Please verify that Neo4j is running at bolt://localhost:7687.", file=sys.stderr)
        sys.exit(1)
    except AuthError as exc:
        print(f"Error: Neo4j authentication failure ({exc}).", file=sys.stderr)
        print("Please check NEO4J_USER and NEO4J_PASSWORD environment variables.", file=sys.stderr)
        sys.exit(1)
    except Neo4jError as exc:
        print(f"Neo4j database query error: {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"Unexpected error seeding graph: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
