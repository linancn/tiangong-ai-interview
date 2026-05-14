import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApiAuth } from "@/lib/server/admin-auth";
import {
  createInterviewWithSession,
  deleteInterviewBySessionId,
  linesToGoals,
  linesToRubric,
  listAdminSessions,
} from "@/lib/server/interviews";
import { candidateInterviewUrl } from "@/lib/server/request-url";

const CreateInterviewSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().optional(),
  companyContext: z.string().optional(),
  roleName: z.string().min(1),
  jd: z.string().optional(),
  goalsText: z.string().optional(),
  rubricText: z.string().optional(),
  maxTurns: z.coerce.number().int().min(1).max(30).default(10),
  candidateName: z.string().optional(),
  candidateResume: z.string().optional(),
});

const DeleteInterviewSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function GET() {
  try {
    const authError = await requireAdminApiAuth();
    if (authError) return authError;

    const rows = await listAdminSessions();
    return NextResponse.json({
      sessions: rows.map(({ session, interview, report }) => ({
        session,
        interview,
        report,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load interviews.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const authError = await requireAdminApiAuth();
    if (authError) return authError;

    const payload = CreateInterviewSchema.parse(await req.json());
    const { session, interview, report } = await createInterviewWithSession({
      title: payload.title,
      companyName: payload.companyName,
      companyContext: payload.companyContext,
      roleName: payload.roleName,
      jd: payload.jd,
      goals: linesToGoals(payload.goalsText ?? ""),
      rubric: linesToRubric(payload.rubricText ?? ""),
      maxTurns: payload.maxTurns,
      candidateName: payload.candidateName,
      candidateResume: payload.candidateResume,
    });

    return NextResponse.json({
      interview,
      session,
      report,
      candidateUrl: candidateInterviewUrl(session.token, req),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create interview.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authError = await requireAdminApiAuth();
    if (authError) return authError;

    const payload = DeleteInterviewSchema.parse(await req.json());
    const deleted = await deleteInterviewBySessionId(payload.sessionId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Interview session not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete interview.",
      },
      { status: 400 },
    );
  }
}
