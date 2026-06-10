import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { getLatestUserMessage, getMessageText } from "@/lib/interview/messages";
import {
  appendAskedQuestion,
  mergeReportState,
  renderMarkdownReport,
} from "@/lib/interview/report";
import {
  buildEvaluatorPrompt,
  buildInterviewerPrompt,
} from "@/lib/interview/prompts";
import {
  finishSession,
  getSessionBundleByToken,
  incrementTurn,
  listSessionMessages,
  saveMessage,
  saveReportState,
} from "@/lib/server/interviews";
import { getInterviewModel } from "@/lib/server/model";

export const maxDuration = 30;

const EvalSchema = z.object({
  shouldFinish: z.boolean(),
  currentDimension: z.string(),
  scorePatches: z.array(
    z.object({
      dimension: z.string(),
      score: z.number().min(0).max(10),
      evidence: z.array(z.string()),
      concerns: z.array(z.string()),
    }),
  ),
  nextFocus: z.string(),
  reportNotes: z.array(z.string()),
  riskFlags: z.array(z.string()),
  recommendedFollowups: z.array(z.string()),
  llmAssistance: z.object({
    likelihood: z.enum(["unknown", "low", "medium", "high"]),
    summary: z.string(),
    indicators: z.array(z.string()),
    counterIndicators: z.array(z.string()),
  }),
});

function textStreamResponse(text: string) {
  const stream = createUIMessageStream({
    execute({ writer }) {
      const id = "completion-message";
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function completionMessage(language: "zh" | "en") {
  return language === "en"
    ? "The interview is now complete. No further reply is needed. Thank you for participating."
    : "本次面试到此结束，后续无需继续回复。感谢你的参与。";
}

function transcriptForPrompt(
  messages: Array<{ role: string; content: string }>,
) {
  return messages
    .slice(-12)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token.", { status: 400 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const latestUserMessage = getLatestUserMessage(messages);
  const latestUserText = latestUserMessage
    ? getMessageText(latestUserMessage)
    : "";

  const bundle = await getSessionBundleByToken(token);
  if (!bundle) {
    return new Response("Session not found.", { status: 404 });
  }

  if (bundle.session.status === "finished") {
    return textStreamResponse(completionMessage(bundle.interview.language));
  }

  if (!latestUserMessage || !latestUserText) {
    return new Response("Missing latest user message.", { status: 400 });
  }

  await saveMessage({
    sessionId: bundle.session.id,
    externalId: latestUserMessage.id,
    role: "user",
    content: latestUserText,
    metadata: { source: "assistant-ui" },
  });

  const savedMessages = await listSessionMessages(bundle.session.id);
  const model = getInterviewModel();

  const evalResult = await generateObject({
    model,
    schema: EvalSchema,
    system: buildEvaluatorPrompt({
      roleName: bundle.interview.roleName,
      language: bundle.interview.language,
      companyName: bundle.interview.companyName,
      companyContext: bundle.interview.companyContext,
      jd: bundle.interview.jd,
      goals: bundle.interview.goals,
      rubric: bundle.interview.rubric,
      reportState: bundle.reportState,
      candidateResume: bundle.session.candidateResume,
    }),
    prompt: `最近对话：\n${transcriptForPrompt(savedMessages)}\n\n候选人最新回答：\n${latestUserText}`,
  });

  const nextReportState = mergeReportState(
    bundle.reportState,
    evalResult.object,
    bundle.interview.rubric,
  );

  const shouldFinish =
    evalResult.object.shouldFinish ||
    bundle.session.turnCount + 1 >= bundle.interview.maxTurns;

  if (shouldFinish) {
    const finalMessageText = completionMessage(bundle.interview.language);
    const finalReportState = {
      ...nextReportState,
      overallStatus: "finished" as const,
    };
    const finalMarkdown = renderMarkdownReport({
      roleName: bundle.interview.roleName,
      language: bundle.interview.language,
      companyName: bundle.interview.companyName,
      candidateName: bundle.session.candidateName,
      rubric: bundle.interview.rubric,
      reportState: finalReportState,
      transcript: savedMessages,
    });

    await saveMessage({
      sessionId: bundle.session.id,
      externalId: `assistant:completion:${latestUserMessage.id}`,
      role: "assistant",
      content: finalMessageText,
      metadata: { type: "completion" },
    });

    await finishSession({
      sessionId: bundle.session.id,
      reportState: finalReportState,
      finalMarkdown,
    });

    return textStreamResponse(finalMessageText);
  }

  await saveReportState(bundle.session.id, nextReportState);

  const result = streamText({
    model,
    system: `${buildInterviewerPrompt({
      roleName: bundle.interview.roleName,
      language: bundle.interview.language,
      companyName: bundle.interview.companyName,
      companyContext: bundle.interview.companyContext,
      jd: bundle.interview.jd,
      goals: bundle.interview.goals,
      rubric: bundle.interview.rubric,
      reportState: nextReportState,
      nextFocus: evalResult.object.nextFocus,
      candidateResume: bundle.session.candidateResume,
    })}\n\n最近对话：\n${transcriptForPrompt(savedMessages)}`,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text, usage, finishReason }) => {
      const assistantMessage = await saveMessage({
        sessionId: bundle.session.id,
        externalId: `assistant:${Date.now()}`,
        role: "assistant",
        content: text,
        metadata: { usage, finishReason },
      });

      if (assistantMessage) {
        await saveReportState(
          bundle.session.id,
          appendAskedQuestion(nextReportState, text),
        );
      }

      await incrementTurn(bundle.session.id);
    },
  });

  return result.toUIMessageStreamResponse();
}
