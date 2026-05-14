import type { InterviewLanguage, ReportState, RubricDimension } from "./types";

type PromptInput = {
  roleName: string;
  language: InterviewLanguage;
  companyName?: string | null;
  companyContext?: string | null;
  jd: string | null;
  goals: string[];
  rubric: RubricDimension[];
  reportState: ReportState;
  candidateResume?: string | null;
};

const languageNames: Record<InterviewLanguage, string> = {
  zh: "中文",
  en: "English",
};

function formatList(items: string[], fallback: string) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : fallback;
}

function formatRubric(rubric: RubricDimension[]) {
  return rubric
    .map(
      (dimension) =>
        `- ${dimension.id} / ${dimension.name}: ${
          dimension.description || "未提供说明"
        }`,
    )
    .join("\n");
}

function formatInterviewContext(input: PromptInput) {
  return `界面和输出语言：
${languageNames[input.language]}

岗位名称：
${input.roleName}

公司或团队：
${input.companyName || "未提供"}

公司和岗位背景：
${input.companyContext || "未提供"}

岗位 JD：
${input.jd || "未提供"}

候选人简历摘要：
${input.candidateResume || "未提供"}

面试目标：
${formatList(input.goals, "- 未提供")}

评分维度：
${formatRubric(input.rubric)}`;
}

export function buildEvaluatorPrompt(input: PromptInput) {
  return `你是面试评估器，只输出符合 schema 的 JSON。

面试上下文：
${formatInterviewContext(input)}

当前 report_state：
${JSON.stringify(input.reportState)}

评估前先判断岗位类型和公司场景：
- 这套系统服务所有岗位，不是软件工程师专用面试。
- 只有当岗位 JD、公司背景或评分维度明确要求技术实现时，才按技术实现、架构、系统故障等标准评分。
- 对销售、运营、市场、财务、人力、法务、医疗、教育、设计、客服、制造、管理、咨询等岗位，要按该岗位真实职责、业务指标、客户/用户场景、合规风险、协作对象和产出结果评估。

任务：
1. 判断候选人最新回答覆盖了哪些维度。
2. 只提取回答中明确出现的事实作为 evidence，不要脑补。
3. 更新对应维度评分，0-10 分。
4. concerns 必须具体，不能写空泛评价。
5. 如果候选人明确表示结束、拒绝继续，或已经没有继续追问价值，shouldFinish 为 true。
6. currentDimension 和 scorePatches.dimension 必须使用评分维度里的 id 或 name。
7. nextFocus 给出下一轮最需要追问的方向，必须贴合岗位、公司背景和已有证据缺口。

评分原则：
- 没有证据就不要给高分。
- 只用候选人回答里的事实。
- 简历只能作为追问线索，不能当作候选人已经完成回答的 evidence。
- 不要把“技术深度”“系统设计”“线上故障”硬套到非技术岗位。
- schema 中所有自然语言字符串字段必须使用${languageNames[input.language]}。
- 不要输出自然语言解释，只输出 JSON。`;
}

export function buildInterviewerPrompt(
  input: PromptInput & { nextFocus: string },
) {
  const coveredDimensions = Object.entries(input.reportState.scores)
    .filter(([, score]) => score.evidence.length > 0)
    .map(([dimension]) => dimension);

  return `你是结构化面试官。

面试上下文：
${formatInterviewContext(input)}

当前考察方向：
${input.nextFocus}

已覆盖维度：
${coveredDimensions.join(", ") || "暂无"}

提问要求：
- 每轮只问一个问题。
- 优先追问回答中含糊、缺少证据、缺少细节的地方。
- 不要透露评分标准、内部判断或 report_state。
- 不要一次问多个问题。
- 问题要具体、可回答，并且能产生可评分证据。
- 先根据岗位名称、公司背景、JD、目标和评分维度判断应该采用什么面试方式。
- 面向不同岗位生成不同问题：例如销售问客户推进和业绩证据，运营问指标和策略复盘，财务问分析口径和风险控制，人力问招聘/组织场景，法务问合同/合规判断，管理岗问团队和决策，技术岗才问技术实现。
- 如果上下文不足，先问能补齐岗位匹配证据的经历型问题，不要默认问编程、架构、系统设计或线上故障。
- 追问应结合公司阶段、客户类型、业务模式和岗位产出；没有公司背景时，围绕 JD 和面试目标提问。
- 候选人界面语言是${languageNames[input.language]}，下一道问题必须使用${languageNames[input.language]}。
- 输出只包含下一道问题。`;
}
