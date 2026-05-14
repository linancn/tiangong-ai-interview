import { and, asc, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db";
import {
  interviewMessages,
  interviewReports,
  interviewSessions,
  interviews,
} from "@/db/schema";
import {
  createInitialReportState,
  DEFAULT_RUBRIC,
  normalizeId,
  type MessageRole,
  type ReportState,
  type RubricDimension,
} from "@/lib/interview/types";

export type CreateInterviewInput = {
  title: string;
  companyName?: string;
  companyContext?: string;
  roleName: string;
  jd?: string;
  goals: string[];
  rubric: RubricDimension[];
  maxTurns: number;
  candidateName?: string;
  candidateResume?: string;
};

function ensureReportState(
  reportState: ReportState | Record<string, never>,
  rubric: RubricDimension[],
) {
  if ("scores" in reportState && reportState.scores) {
    return reportState as ReportState;
  }

  return createInitialReportState(rubric);
}

export function linesToGoals(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function linesToRubric(value: string): RubricDimension[] {
  const dimensions = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [namePart, ...descriptionParts] = line.split(/[:：-]/);
      const name = namePart.trim() || `维度 ${index + 1}`;
      return {
        id: normalizeId(name),
        name,
        description: descriptionParts.join("-").trim() || undefined,
      };
    });

  return dimensions.length > 0 ? dimensions : DEFAULT_RUBRIC;
}

export async function createInterviewWithSession(input: CreateInterviewInput) {
  const db = getDb();
  const cleanRubric = input.rubric.length > 0 ? input.rubric : DEFAULT_RUBRIC;
  const token = nanoid(32);

  const [interview] = await db
    .insert(interviews)
    .values({
      title: input.title,
      companyName: input.companyName || null,
      companyContext: input.companyContext || null,
      roleName: input.roleName,
      jd: input.jd || null,
      goals: input.goals,
      rubric: cleanRubric,
      maxTurns: input.maxTurns,
    })
    .returning();

  const [session] = await db
    .insert(interviewSessions)
    .values({
      interviewId: interview.id,
      candidateName: input.candidateName || null,
      candidateResume: input.candidateResume || null,
      token,
    })
    .returning();

  const [report] = await db
    .insert(interviewReports)
    .values({
      sessionId: session.id,
      reportState: createInitialReportState(cleanRubric),
    })
    .returning();

  return { interview, session, report };
}

export async function getSessionBundleByToken(token: string) {
  const db = getDb();
  const [row] = await db
    .select({
      session: interviewSessions,
      interview: interviews,
      report: interviewReports,
    })
    .from(interviewSessions)
    .innerJoin(interviews, eq(interviewSessions.interviewId, interviews.id))
    .innerJoin(
      interviewReports,
      eq(interviewReports.sessionId, interviewSessions.id),
    )
    .where(eq(interviewSessions.token, token));

  if (!row) return null;

  return {
    ...row,
    reportState: ensureReportState(row.report.reportState, row.interview.rubric),
  };
}

export async function getSessionBundleById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      session: interviewSessions,
      interview: interviews,
      report: interviewReports,
    })
    .from(interviewSessions)
    .innerJoin(interviews, eq(interviewSessions.interviewId, interviews.id))
    .innerJoin(
      interviewReports,
      eq(interviewReports.sessionId, interviewSessions.id),
    )
    .where(eq(interviewSessions.id, id));

  if (!row) return null;

  return {
    ...row,
    reportState: ensureReportState(row.report.reportState, row.interview.rubric),
  };
}

export async function listAdminSessions() {
  const db = getDb();
  return db
    .select({
      session: interviewSessions,
      interview: interviews,
      report: interviewReports,
    })
    .from(interviewSessions)
    .innerJoin(interviews, eq(interviewSessions.interviewId, interviews.id))
    .leftJoin(
      interviewReports,
      eq(interviewReports.sessionId, interviewSessions.id),
    )
    .orderBy(desc(interviewSessions.createdAt));
}

export async function listSessionMessages(sessionId: string) {
  const db = getDb();
  return db
    .select()
    .from(interviewMessages)
    .where(eq(interviewMessages.sessionId, sessionId))
    .orderBy(asc(interviewMessages.createdAt));
}

export async function saveMessage(input: {
  sessionId: string;
  externalId?: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.content.trim()) return null;

  const db = getDb();
  const [message] = await db
    .insert(interviewMessages)
    .values({
      sessionId: input.sessionId,
      externalId: input.externalId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .onConflictDoNothing({
      target: [interviewMessages.sessionId, interviewMessages.externalId],
    })
    .returning();

  return message ?? null;
}

export async function saveReportState(
  sessionId: string,
  reportState: ReportState,
) {
  const db = getDb();
  const [report] = await db
    .update(interviewReports)
    .set({ reportState, updatedAt: new Date() })
    .where(eq(interviewReports.sessionId, sessionId))
    .returning();

  return report;
}

export async function finishSession(input: {
  sessionId: string;
  reportState: ReportState;
  finalMarkdown: string;
}) {
  const db = getDb();
  await db
    .update(interviewReports)
    .set({
      reportState: input.reportState,
      finalMarkdown: input.finalMarkdown,
      updatedAt: new Date(),
    })
    .where(eq(interviewReports.sessionId, input.sessionId));

  await db
    .update(interviewSessions)
    .set({ status: "finished", finishedAt: new Date() })
    .where(eq(interviewSessions.id, input.sessionId));
}

export async function incrementTurn(sessionId: string) {
  const db = getDb();
  await db
    .update(interviewSessions)
    .set({ turnCount: sql`${interviewSessions.turnCount} + 1` })
    .where(
      and(
        eq(interviewSessions.id, sessionId),
        eq(interviewSessions.status, "active"),
      ),
    );
}
