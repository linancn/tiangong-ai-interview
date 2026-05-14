import {
  normalizeId,
  type EvalPatch,
  type ReportState,
  type RubricDimension,
} from "./types";

type TranscriptMessage = {
  role: string;
  content: string;
};

type RenderReportInput = {
  roleName: string;
  candidateName?: string | null;
  rubric: RubricDimension[];
  reportState: ReportState;
  transcript: TranscriptMessage[];
};

function uniqueAppend(existing: string[], additions: string[]) {
  const seen = new Set(existing.map((item) => item.trim()).filter(Boolean));

  for (const addition of additions) {
    const value = addition.trim();
    if (value) seen.add(value);
  }

  return Array.from(seen);
}

function resolveDimensionId(
  value: string,
  current: ReportState,
  rubric?: RubricDimension[],
) {
  if (current.scores[value]) return value;

  const normalized = normalizeId(value);
  if (current.scores[normalized]) return normalized;

  const dimension = rubric?.find(
    (item) =>
      item.id === value ||
      item.name === value ||
      normalizeId(item.name) === normalized,
  );

  return dimension?.id ?? value;
}

export function mergeReportState(
  current: ReportState,
  patch: EvalPatch,
  rubric?: RubricDimension[],
): ReportState {
  const next: ReportState = {
    ...current,
    overallStatus: patch.shouldFinish ? "finished" : current.overallStatus,
    currentDimension: patch.currentDimension || current.currentDimension,
    scores: { ...current.scores },
    riskFlags: uniqueAppend(current.riskFlags, patch.riskFlags),
    recommendedFollowups: uniqueAppend(
      current.recommendedFollowups,
      patch.recommendedFollowups,
    ),
    reportNotes: uniqueAppend(current.reportNotes, patch.reportNotes),
  };

  for (const scorePatch of patch.scorePatches) {
    const dimensionId = resolveDimensionId(scorePatch.dimension, current, rubric);
    const existing = next.scores[dimensionId] ?? {
      score: null,
      evidence: [],
      concerns: [],
    };

    next.scores[dimensionId] = {
      score: Math.max(0, Math.min(10, scorePatch.score)),
      evidence: uniqueAppend(existing.evidence, scorePatch.evidence),
      concerns: uniqueAppend(existing.concerns, scorePatch.concerns),
    };
  }

  return next;
}

export function appendAskedQuestion(
  current: ReportState,
  question: string,
): ReportState {
  return {
    ...current,
    askedQuestions: uniqueAppend(current.askedQuestions, [question]),
  };
}

function averageScore(reportState: ReportState) {
  const scores = Object.values(reportState.scores)
    .map((score) => score.score)
    .filter((score): score is number => typeof score === "number");

  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function conclusionFromScore(score: number | null) {
  if (score === null) return "证据不足，建议继续补充面试记录。";
  if (score >= 8) return "整体匹配度较高，建议进入下一轮。";
  if (score >= 6) return "整体具备可讨论基础，建议带着风险点复核。";
  return "当前证据显示匹配度偏低，建议谨慎推进。";
}

function summarizeTranscript(transcript: TranscriptMessage[]) {
  const pairs: string[] = [];
  let currentQuestion = "";

  for (const message of transcript) {
    if (message.role === "assistant") {
      currentQuestion = message.content;
      continue;
    }

    if (message.role === "user" && message.content.trim()) {
      pairs.push(
        `- 问：${currentQuestion || "候选人主动输入"}\n  答：${message.content.trim()}`,
      );
    }
  }

  return pairs.length > 0 ? pairs.join("\n") : "- 暂无完整问答。";
}

export function renderMarkdownReport(input: RenderReportInput) {
  const average = averageScore(input.reportState);
  const scoreRows = input.rubric
    .map((dimension) => {
      const score = input.reportState.scores[dimension.id];
      const evidence = score?.evidence.length ? score.evidence.join("; ") : "暂无";
      const concerns = score?.concerns.length ? score.concerns.join("; ") : "暂无";
      return `| ${dimension.name} | ${score?.score ?? "N/A"} | ${evidence} | ${concerns} |`;
    })
    .join("\n");

  const evidenceList = input.rubric
    .flatMap((dimension) =>
      (input.reportState.scores[dimension.id]?.evidence ?? []).map(
        (evidence) => `- ${dimension.name}: ${evidence}`,
      ),
    )
    .join("\n");

  const riskFlags = input.reportState.riskFlags.length
    ? input.reportState.riskFlags.map((risk) => `- ${risk}`).join("\n")
    : "- 暂无明确风险点。";

  const followups = input.reportState.recommendedFollowups.length
    ? input.reportState.recommendedFollowups
        .map((question) => `- ${question}`)
        .join("\n")
    : "- 暂无建议复试问题。";

  return `# 面试报告：${input.roleName}

候选人：${input.candidateName || "未填写"}

## 一、总体结论

${conclusionFromScore(average)}

平均分：${average === null ? "N/A" : average.toFixed(1)}

## 二、评分概览

| 维度 | 分数 | 证据 | 风险 |
|---|---:|---|---|
${scoreRows}

## 三、关键证据

${evidenceList || "- 暂无可采信证据。"}

## 四、风险点

${riskFlags}

## 五、建议复试问题

${followups}

## 六、完整问答摘要

${summarizeTranscript(input.transcript)}
`;
}
