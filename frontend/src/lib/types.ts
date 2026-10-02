// Shapes returned by the SkillVeda backend (api/student.py, api/ai.py).

export type SkillStatus = 'strong' | 'developing' | 'critical';
export type NodeStatus = SkillStatus | 'owned' | 'context';
export type RoadmapStatus = 'not_started' | 'in_progress' | 'completed';

export type Role = { id: string; title: string; required_skill_count: number };

export type ProfileSkill = {
  skill_id: string;
  skill_name: string;
  category: string;
  proficiency: number;
  confidence: number | null;
  confidence_label: string;
  evidence: string;
  source: string;
  nlp_proficiency: number | null;
  updated_at: string;
};

export type GapEntry = {
  skill_id: string;
  skill_name: string;
  category: string;
  user_proficiency: number;
  required_proficiency: number;
  gap: number;
  demand_weight: number;
};

export type GapItem = GapEntry & {
  status: SkillStatus;
  priority: 'HIGH' | 'MEDIUM' | 'NONE';
  importance: 'core' | 'important' | 'supporting';
  reason: string;
};

export type SkillRef = { skill_id: string; skill_name: string };

export type RoadmapStep = {
  order: number;
  skill_id: string;
  skill_name: string;
  category: string;
  priority: string;
  current_level: number;
  target_level: number;
  gap: number;
  effort_weeks: number;
  demand_weight: number;
  prerequisites: Array<SkillRef & { user_level: number; in_plan: boolean; has_skill: boolean }>;
  unlocks: SkillRef[];
  reason: string;
  status: RoadmapStatus;
  progress: number;
  progress_updated_at: string | null;
};

export type Roadmap = {
  role_id: string;
  role_title: string;
  foundation: Array<SkillRef & { current_level: number; target_level: number }>;
  steps: RoadmapStep[];
  summary: {
    total_steps: number;
    completed_steps: number;
    in_progress_steps: number;
    total_weeks: number;
    percent_complete: number;
  };
};

export type Course = {
  id: string;
  title: string;
  provider: string;
  url: string;
  skills_taught: SkillRef[];
  level: string;
  duration_weeks: number;
  cost?: string;
  description: string;
};

export type CourseGroup = {
  skill_id: string;
  skill_name: string;
  priority: string;
  current_level: number;
  target_level: number;
  gap: number;
  suggested_level: string;
  courses: Course[];
};

export type CatalogMeta = { kind?: string; note?: string; version?: number; is_demo: boolean };

export type JobSummary = {
  id: string;
  title: string;
  company: string;
  location: string;
  employment_type: string;
  match_score: number;
};

export type NextAction = { kind: string; title: string; detail: string; href: string; skill_id?: string };
export type Activity = { kind: string; message: string; created_at: string };

export type Student = {
  id: string;
  name: string;
  education: string;
  institution: string;
  target_role_id: string | null;
  created_at: string;
};

export type Readiness = {
  score: number;
  method: string | null;
  total_required: number;
  strong_count: number;
  developing_count: number;
  critical_count: number;
};

export type Intelligence = {
  student: Student;
  target_role: { id: string; title: string } | null;
  skills: ProfileSkill[];
  has_skills: boolean;
  readiness: Readiness | null;
  strong_skills: GapItem[];
  developing_skills: GapItem[];
  critical_gaps: GapItem[];
  other_skills: Array<SkillRef & { category: string; user_proficiency: number }>;
  roadmap: Roadmap | null;
  recommended_courses: CourseGroup[];
  recommended_jobs: JobSummary[];
  next_actions: NextAction[];
  activity: Activity[];
  catalogs: { courses: CatalogMeta; jobs: CatalogMeta };
};

export type RelatedRef = SkillRef & { user_level: number | null };

export type SkillDetail = {
  skill_id: string;
  skill_name: string;
  category: string;
  demand_weight: number | null;
  profile: ProfileSkill | null;
  target_requirement: {
    role_id: string;
    role_title: string;
    required_level: number;
    current_level: number;
    gap: number;
    importance: string;
    reason: string;
  } | null;
  prerequisites: RelatedRef[];
  related: RelatedRef[];
  unlocks: RelatedRef[];
  required_by_roles: Array<{ role_id: string; role_title: string; required_proficiency: number }>;
  in_roadmap: boolean;
};

export type GraphNode = {
  id: string;
  label: string;
  category: string;
  kind: 'role' | 'skill';
  readiness?: number | null;
  membership?: 'required' | 'profile' | 'prerequisite';
  in_profile?: boolean;
  current_level?: number | null;
  confidence?: number | null;
  required_level?: number | null;
  gap?: number | null;
  status?: NodeStatus;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: 'requires' | 'prerequisite' | 'related';
  required_level?: number;
};

export type StudentGraph = {
  role: { id: string; title: string } | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  domains: string[];
  has_skills: boolean;
};

export type JobMatch = {
  id: string;
  title: string;
  company: string;
  location: string;
  employment_type: string;
  role_id: string | null;
  description: string;
  source_url: string | null;
  match_score: number;
  strong_matches: GapEntry[];
  developing: GapEntry[];
  missing: GapEntry[];
  preferred_skills: Array<SkillRef & { has_skill: boolean }>;
  preparation: Array<SkillRef & { gap: number; course: { id: string; title: string; url: string } | null }>;
};

export type AIAnswer = {
  answer: string;
  source: 'llm' | 'skillveda_engine';
  llm_used: boolean;
  notice?: string;
  provider?: string;
  model?: string;
  cached?: boolean;
};

export type AIStatus = { enabled: boolean; provider: string; model: string | null; reason?: string };

export type ExtractedSkill = {
  skill_id: string;
  skill_name: string;
  category: string;
  proficiency: number;
  confidence: number;
  confidence_label: string;
  evidence: string;
};

export type ResumeAnalysis = {
  analysis_id: string;
  filename: string | null;
  total_skills_found: number;
  skills: ExtractedSkill[];
};
