import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createInterviewWithSession,
  linesToGoals,
  linesToRubric,
  listAdminSessions,
} from "@/lib/server/interviews";

const CreateInterviewSchema = z.object({
  title: z.string().min(1),
  roleName: z.string().min(1),
  jd: z.string().optional(),
  goalsText: z.string().optional(),
  rubricText: z.string().optional(),
  maxTurns: z.coerce.number().int().min(1).max(30).default(10),
  candidateName: z.string().optional(),
  candidateResume: z.string().optional(),
});

export async function GET() {
  try {
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
    const payload = CreateInterviewSchema.parse(await req.json());
    const { session, interview, report } = await createInterviewWithSession({
      title: payload.title,
      roleName: payload.roleName,
      jd: payload.jd,
      goals: linesToGoals(payload.goalsText ?? ""),
      rubric: linesToRubric(payload.rubricText ?? ""),
      maxTurns: payload.maxTurns,
      candidateName: payload.candidateName,
      candidateResume: payload.candidateResume,
    });

    const requestOrigin = req.headers.get("origin") ?? new URL(req.url).origin;
    const origin = requestOrigin.replace("0.0.0.0", "localhost");

    return NextResponse.json({
      interview,
      session,
      report,
      candidateUrl: `${origin}/i/${session.token}`,
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
