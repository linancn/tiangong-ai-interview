import { NextResponse } from "next/server";

import { requireAdminApiAuth } from "@/lib/server/admin-auth";
import {
  getSessionBundleById,
  getSessionBundleByToken,
  listSessionMessages,
} from "@/lib/server/interviews";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const id = url.searchParams.get("id");

    if (token) {
      const bundle = await getSessionBundleByToken(token);

      if (!bundle) {
        return NextResponse.json(
          { error: "Session not found." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        session: {
          status: bundle.session.status,
          turnCount: bundle.session.turnCount,
        },
        interview: {
          roleName: bundle.interview.roleName,
          maxTurns: bundle.interview.maxTurns,
        },
      });
    }

    const authError = await requireAdminApiAuth();
    if (authError) return authError;

    const bundle = id ? await getSessionBundleById(id) : null;

    if (!bundle) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const messages = await listSessionMessages(bundle.session.id);

    return NextResponse.json({
      session: bundle.session,
      interview: bundle.interview,
      report: bundle.report,
      reportState: bundle.reportState,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load history.",
      },
      { status: 500 },
    );
  }
}
