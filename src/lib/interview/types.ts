export type InterviewStatus = "active" | "finished";

export type RubricDimension = {
  id: string;
  name: string;
  description?: string;
  weight?: number;
};

export type DimensionScore = {
  score: number | null;
  evidence: string[];
  concerns: string[];
};

export type ReportState = {
  overallStatus: "in_progress" | "finished";
  currentDimension: string | null;
  scores: Record<string, DimensionScore>;
  askedQuestions: string[];
  riskFlags: string[];
  recommendedFollowups: string[];
  reportNotes: string[];
};

export type EvalPatch = {
  shouldFinish: boolean;
  currentDimension: string;
  scorePatches: Array<{
    dimension: string;
    score: number;
    evidence: string[];
    concerns: string[];
  }>;
  nextFocus: string;
  reportNotes: string[];
  riskFlags: string[];
  recommendedFollowups: string[];
};

export type MessageRole = "user" | "assistant" | "system";

export const DEFAULT_RUBRIC: RubricDimension[] = [
  {
    id: "technical_depth",
    name: "技术深度",
    description: "能解释关键技术选择、边界条件和线上问题处理。",
  },
  {
    id: "problem_solving",
    name: "问题拆解",
    description: "能把开放问题拆成可验证的假设和执行步骤。",
  },
  {
    id: "communication",
    name: "沟通表达",
    description: "表达清晰，能给出事实、取舍和结果。",
  },
];

export function createInitialReportState(
  rubric: RubricDimension[],
): ReportState {
  const scores = Object.fromEntries(
    rubric.map((dimension) => [
      dimension.id,
      {
        score: null,
        evidence: [],
        concerns: [],
      } satisfies DimensionScore,
    ]),
  );

  return {
    overallStatus: "in_progress",
    currentDimension: rubric[0]?.id ?? null,
    scores,
    askedQuestions: [],
    riskFlags: [],
    recommendedFollowups: [],
    reportNotes: [],
  };
}

export function normalizeId(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "dimension";
}
