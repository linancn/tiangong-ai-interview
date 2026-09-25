import {
  normalizeId,
  type EvalPatch,
  type InterviewLanguage,
  type LlmAssistanceAnalysis,
  type LlmAssistanceLikelihood,
  type ReportState,
  type RubricDimension,
} from "./types";

type TranscriptMessage = {
  role: string;
  content: string;
};

type RenderReportInput = {
  roleName: string;
  language: InterviewLanguage;
  companyName?: string | null;
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

function mergeLlmAssistance(
  current: LlmAssistanceAnalysis,
  patch: LlmAssistanceAnalysis,
): LlmAssistanceAnalysis {
  return {
    likelihood: patch.likelihood || current.likelihood,
    summary: patch.summary.trim() || current.summary,
    indicators: uniqueAppend(current.indicators, patch.indicators),
    counterIndicators: uniqueAppend(
      current.counterIndicators,
      patch.counterIndicators,
    ),
  };
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
    llmAssistance: mergeLlmAssistance(
      current.llmAssistance,
      patch.llmAssistance,
    ),
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

function conclusionFromScore(score: number | null) {
  if (score === null) return "证据不足，建议继续补充面试记录。";
  if (score >= 8) return "整体匹配度较高，建议进入下一轮。";
  if (score >= 6) return "整体具备可讨论基础，建议带着风险点复核。";
  return "当前证据显示匹配度偏低，建议谨慎推进。";
}

function conclusionFromScoreEn(score: number | null) {
  if (score === null) {
    return "Evidence is insufficient. Continue the interview before making a decision.";
  }
  if (score >= 8) return "Overall match is strong. Recommend moving forward.";
  if (score >= 6) {
    return "There is a reasonable basis to continue, with risks to review.";
  }
  return "Current evidence indicates a weak fit. Proceed with caution.";
}

export function getReportAssessment(
  reportState: ReportState,
  rubric: RubricDimension[],
  language: InterviewLanguage,
) {
  const scores = rubric
    .map((dimension) => reportState.scores[dimension.id]?.score)
    .filter(
      (score): score is number =>
        typeof score === "number" && Number.isFinite(score),
    );
  const scoredDimensions = scores.length;
  const totalDimensions = rubric.length;
  const average =
    scoredDimensions > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scoredDimensions
      : null;
  const complete = totalDimensions > 0 && scoredDimensions === totalDimensions;
  const conclusion = !complete
    ? language === "en"
      ? "Some dimensions remain unscored. Gather more interview evidence before making a clear recommendation to move forward."
      : "仍有维度未评分，现有证据不足以给出明确的通过建议；请补充相关面试证据。"
    : language === "en"
      ? conclusionFromScoreEn(average)
      : conclusionFromScore(average);

  return { scoredDimensions, totalDimensions, average, complete, conclusion };
}

function llmLikelihoodLabel(
  likelihood: LlmAssistanceLikelihood,
  language: InterviewLanguage,
) {
  const labels = {
    zh: {
      unknown: "证据不足",
      low: "较低",
      medium: "中等",
      high: "较高",
    },
    en: {
      unknown: "Insufficient evidence",
      low: "Low",
      medium: "Medium",
      high: "High",
    },
  } satisfies Record<
    InterviewLanguage,
    Record<LlmAssistanceLikelihood, string>
  >;

  return labels[language][likelihood];
}

function renderLlmAssistanceAnalysis(
  analysis: LlmAssistanceAnalysis,
  language: InterviewLanguage,
) {
  const likelihood = llmLikelihoodLabel(analysis.likelihood, language);
  const summary =
    analysis.summary ||
    (language === "en"
      ? "There is not enough reliable evidence to assess LLM-assisted answering."
      : "目前没有足够可靠证据判断是否使用了大模型辅助作答。");
  const indicators = analysis.indicators.length
    ? analysis.indicators.map((item) => `- ${item}`).join("\n")
    : language === "en"
      ? "- No clear supporting signals."
      : "- 暂无明确支持线索。";
  const counterIndicators = analysis.counterIndicators.length
    ? analysis.counterIndicators.map((item) => `- ${item}`).join("\n")
    : language === "en"
      ? "- No clear counter-signals."
      : "- 暂无明确反向线索。";

  if (language === "en") {
    return `Likelihood: ${likelihood}

Summary: ${summary}

Supporting signals:
${indicators}

Counter-signals:
${counterIndicators}`;
  }

  return `可能性判断：${likelihood}

综合分析：${summary}

支持线索：
${indicators}

反向线索：
${counterIndicators}`;
}

function summarizeTranscript(
  transcript: TranscriptMessage[],
  language: InterviewLanguage,
) {
  const pairs: string[] = [];
  let currentQuestion = "";

  for (const message of transcript) {
    if (message.role === "assistant") {
      currentQuestion = message.content;
      continue;
    }

    if (message.role === "user" && message.content.trim()) {
      const fallbackQuestion =
        language === "en" ? "Candidate-initiated input" : "候选人主动输入";
      const questionLabel = language === "en" ? "Q" : "问";
      const answerLabel = language === "en" ? "A" : "答";

      pairs.push(
        `- ${questionLabel}: ${currentQuestion || fallbackQuestion}\n  ${answerLabel}: ${message.content.trim()}`,
      );
    }
  }

  if (pairs.length > 0) return pairs.join("\n");
  return language === "en" ? "- No complete Q&A yet." : "- 暂无完整问答。";
}

export function renderMarkdownReport(input: RenderReportInput) {
  if (input.language === "en") {
    return renderMarkdownReportEn(input);
  }

  const assessment = getReportAssessment(
    input.reportState,
    input.rubric,
    input.language,
  );
  const headerLines = [
    input.companyName ? `公司或团队：${input.companyName}` : null,
    `候选人：${input.candidateName || "未填写"}`,
  ]
    .filter(Boolean)
    .join("\n");
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

${headerLines}

## 一、总体结论

${assessment.conclusion}

已评分维度：${assessment.scoredDimensions} / ${assessment.totalDimensions}

平均分${assessment.complete ? "" : "（仅已评分维度）"}：${assessment.average === null ? "N/A" : assessment.average.toFixed(1)}

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

## 六、大模型辅助使用迹象

${renderLlmAssistanceAnalysis(input.reportState.llmAssistance, input.language)}

## 七、完整问答摘要

${summarizeTranscript(input.transcript, input.language)}
`;
}

function renderMarkdownReportEn(input: RenderReportInput) {
  const assessment = getReportAssessment(
    input.reportState,
    input.rubric,
    input.language,
  );
  const headerLines = [
    input.companyName ? `Company or team: ${input.companyName}` : null,
    `Candidate: ${input.candidateName || "Not provided"}`,
  ]
    .filter(Boolean)
    .join("\n");
  const scoreRows = input.rubric
    .map((dimension) => {
      const score = input.reportState.scores[dimension.id];
      const evidence = score?.evidence.length
        ? score.evidence.join("; ")
        : "None";
      const concerns = score?.concerns.length
        ? score.concerns.join("; ")
        : "None";
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
    : "- No clear risk flags yet.";

  const followups = input.reportState.recommendedFollowups.length
    ? input.reportState.recommendedFollowups
        .map((question) => `- ${question}`)
        .join("\n")
    : "- No follow-up questions recommended yet.";

  return `# Interview Report: ${input.roleName}

${headerLines}

## 1. Overall Recommendation

${assessment.conclusion}

Scored dimensions: ${assessment.scoredDimensions} / ${assessment.totalDimensions}

Average score${assessment.complete ? "" : " (scored dimensions only)"}: ${assessment.average === null ? "N/A" : assessment.average.toFixed(1)}

## 2. Score Overview

| Dimension | Score | Evidence | Risk |
|---|---:|---|---|
${scoreRows}

## 3. Key Evidence

${evidenceList || "- No reliable evidence yet."}

## 4. Risk Flags

${riskFlags}

## 5. Recommended Follow-up Questions

${followups}

## 6. LLM Assistance Signals

${renderLlmAssistanceAnalysis(input.reportState.llmAssistance, input.language)}

## 7. Full Q&A Summary

${summarizeTranscript(input.transcript, input.language)}
`;
}
