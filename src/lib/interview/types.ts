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
    id: "role_fit",
    name: "岗位匹配度",
    description: "过往经历、职责范围和成果证据与目标岗位的匹配程度。",
  },
  {
    id: "domain_judgment",
    name: "专业判断",
    description: "能结合岗位场景做出合理判断、取舍和风险识别。",
  },
  {
    id: "execution_ownership",
    name: "执行与负责",
    description: "能说明如何推进任务、衡量结果、复盘问题并承担责任。",
  },
  {
    id: "communication",
    name: "沟通表达",
    description: "表达清晰，能给出事实、背景、行动和结果，并适配协作对象。",
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
