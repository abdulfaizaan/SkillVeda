"""
Neo4j Graph Database Connection Wrapper for SkillGraph Bharat.

Provides a thread-safe connection wrapper for interacting with Neo4j,
executing Cypher queries, retrieving skills, roles, prerequisites, and demand data.
"""

import os
import logging
from typing import Any, Dict, List, Optional
from neo4j import GraphDatabase, Driver
from neo4j.exceptions import (
    AuthError,
    ConfigurationError,
    DriverError,
    Neo4jError,
    ServiceUnavailable,
)

logger = logging.getLogger(__name__)

# Connection configuration defaults from environment variables
DEFAULT_NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
DEFAULT_NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
DEFAULT_NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "skillgraph2026")


class GraphDB:
    """
    Neo4j Graph Database connection wrapper providing utility methods
    for querying skills, roles, prerequisites, and market demand.
    """

    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
    ) -> None:
        """
        Initialize the GraphDB instance.

        Args:
            uri: Neo4j bolt/neo4j URI. Defaults to os.getenv("NEO4J_URI", "bolt://localhost:7687").
            user: Neo4j username. Defaults to os.getenv("NEO4J_USER", "neo4j").
            password: Neo4j password. Defaults to os.getenv("NEO4J_PASSWORD", "skillgraph2026").
        """
        self.uri = uri or DEFAULT_NEO4J_URI
        self.user = user or DEFAULT_NEO4J_USER
        self.password = password or DEFAULT_NEO4J_PASSWORD
        self._driver: Optional[Driver] = None
        self._init_driver()

    def _init_driver(self) -> None:
        """Initialize the Neo4j driver with configured credentials."""
        try:
            self._driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password),
            )
            logger.info("Initialized Neo4j driver for URI: %s", self.uri)
        except (AuthError, ConfigurationError, ServiceUnavailable) as exc:
            logger.error("Failed to initialize Neo4j driver: %s", exc)
            raise
        except Exception as exc:
            logger.error("Unexpected error initializing Neo4j driver: %s", exc)
            raise

    def verify_connectivity(self) -> bool:
        """
        Verify connectivity to the Neo4j database instance.

        Returns:
            True if connection was successful.

        Raises:
            AuthError: If authentication failed.
            ServiceUnavailable: If database is unreachable.
        """
        if not self._driver:
            raise ServiceUnavailable("Neo4j driver is not initialized.")
        try:
            self._driver.verify_connectivity()
            return True
        except AuthError as exc:
            logger.error("Neo4j authentication failed for user '%s': %s", self.user, exc)
            raise
        except ServiceUnavailable as exc:
            logger.error("Neo4j service unavailable at '%s' (connection refused): %s", self.uri, exc)
            raise
        except Exception as exc:
            logger.error("Failed to verify Neo4j connectivity: %s", exc)
            raise

    def query(self, cypher: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Execute a Cypher query with optional parameters and return records as a list of dicts.

        Args:
            cypher: The Cypher query string.
            params: Optional parameter dictionary for parameterized Cypher queries.

        Returns:
            List of dictionaries containing the query results.

        Raises:
            ServiceUnavailable: When database connection cannot be established or refused.
            AuthError: When database authentication fails.
            Neo4jError: When Cypher syntax or runtime error occurs.
        """
        if not self._driver:
            raise ServiceUnavailable("Neo4j driver is not initialized or has been closed.")

        if params is None:
            params = {}

        try:
            with self._driver.session() as session:
                result = session.run(cypher, params)
                return [record.data() for record in result]
        except AuthError as exc:
            logger.error("Authentication failed executing Cypher query: %s", exc)
            raise
        except ServiceUnavailable as exc:
            logger.error("Neo4j connection refused or service unavailable: %s", exc)
            raise
        except Neo4jError as exc:
            logger.error("Cypher execution error: %s | Query: %s", exc, cypher)
            raise
        except Exception as exc:
            logger.error("Unexpected error running Cypher query: %s", exc)
            raise

    def get_skills_for_role(self, role_id: str) -> List[Dict[str, Any]]:
        """
        Return all skills required for a specified role ID.

        Args:
            role_id: Identifier of the role (e.g., 'backend_engineer').

        Returns:
            List of dictionaries containing skill details and required proficiency score.
        """
        cypher = """
        MATCH (r:Role {id: $role_id})-[req:REQUIRES]->(s:Skill)
        RETURN s.id AS id,
               s.name AS name,
               s.category AS category,
               s.demand_weight AS demand_weight,
               req.proficiency_required AS proficiency_required
        ORDER BY req.proficiency_required DESC, s.name ASC
        """
        return self.query(cypher, {"role_id": role_id})

    def get_demand_for_skill(self, skill_id: str) -> Dict[str, Any]:
        """
        Return market demand data for a given skill ID.

        Args:
            skill_id: Identifier of the skill (e.g., 'python').

        Returns:
            Dictionary containing demand weight, role count, and roles requiring the skill.
        """
        cypher = """
        MATCH (s:Skill {id: $skill_id})
        OPTIONAL MATCH (r:Role)-[req:REQUIRES]->(s)
        RETURN s.id AS id,
               s.name AS name,
               s.category AS category,
               s.demand_weight AS demand_weight,
               count(r) AS role_count,
               collect(r.title) AS required_by_roles
        """
        records = self.query(cypher, {"skill_id": skill_id})
        if records and records[0].get("id") is not None:
            return records[0]
        return {}

    def get_related_skills(self, skill_id: str) -> List[Dict[str, Any]]:
        """
        Return related and prerequisite skills for a given skill ID.

        Args:
            skill_id: Identifier of the skill (e.g., 'machine_learning').

        Returns:
            List of dictionaries containing related/prerequisite skills, relationship type,
            and relationship direction.
        """
        cypher = """
        MATCH (s:Skill {id: $skill_id})-[rel:PREREQUISITE_OF|RELATED_TO]-(other:Skill)
        RETURN DISTINCT other.id AS id,
               other.name AS name,
               other.category AS category,
               other.demand_weight AS demand_weight,
               type(rel) AS relationship_type,
               CASE
                   WHEN type(rel) = 'PREREQUISITE_OF' AND startNode(rel) = s THEN 'prerequisite_for'
                   WHEN type(rel) = 'PREREQUISITE_OF' AND endNode(rel) = s THEN 'requires_prerequisite'
                   ELSE 'related'
               END AS relationship_direction
        ORDER BY other.name ASC
        """
        return self.query(cypher, {"skill_id": skill_id})

    def get_all_roles(self) -> List[Dict[str, Any]]:
        """
        Return all roles stored in the graph database.

        Returns:
            List of dictionaries containing role id and title.
        """
        cypher = """
        MATCH (r:Role)
        RETURN r.id AS id, r.title AS title
        ORDER BY r.title ASC
        """
        return self.query(cypher)

    def get_all_skills(self) -> List[Dict[str, Any]]:
        """
        Return all skills stored in the graph database.

        Returns:
            List of dictionaries containing skill id, name, category, and demand weight.
        """
        cypher = """
        MATCH (s:Skill)
        RETURN s.id AS id, s.name AS name, s.category AS category, s.demand_weight AS demand_weight
        ORDER BY s.name ASC
        """
        return self.query(cypher)

    def close(self) -> None:
        """Close the Neo4j driver connection."""
        if self._driver is not None:
            try:
                self._driver.close()
                logger.info("Closed Neo4j driver connection.")
            except Exception as exc:
                logger.warning("Error while closing Neo4j driver: %s", exc)
            finally:
                self._driver = None

    def __enter__(self) -> "GraphDB":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()
