export interface Career {
  id: string;
  title: string;
  slug: string;
  field: CareerField;
  subfield: string;
  description: string;
  shortDescription: string;
  overview: string;
  whatItDoes: string;
  avgSalaryIndia: string;
  avgSalaryGlobal: string;
  demandTrend: 'rising' | 'stable' | 'declining';
  timeToJobReady: string;
  skillsRequired: string[];
  stages: RoadmapStage[];
  relatedCareers: string[];
  tags: string[];
  aliases?: string[];
  icon: string;
  roadmapShUrl?: string;
  recommendedResourceIds: string[];
  recommendedJobs: CareerJob[];
  matchExplanation?: string;
  dailyReality?: string[];
  beginnersUnderestimate?: string[];
  avoidThisCareer?: string[];
  transitionPaths?: string[];
  sources?: string[];
}

export interface CareerJob {
  title: string;
  requiredSkills: string[];
}

export interface RoadmapStage {
  id: string;
  title: string;
  description: string;
  duration: string;
  skills: string[];
  resources: string[];
  milestones: string[];
  order: number;
  whyExists?: string;
  whyThisStep?: string;
  whyNow?: string;
  whyBeforeNext?: string;
  realWorldUsage?: string;
  sources?: string[];
  prerequisiteKnowledge?: string[];
  estimatedStudyTime?: string;
  expectedOutcome?: string;
  readyToMoveOn?: string[];
  commonMistakes?: string[];
  suggestedProjects?: string[];
}

export type CareerField = string;
