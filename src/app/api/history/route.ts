import { NextResponse } from "next/server";

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
    const bundle = token
      ? await getSessionBundleByToken(token)
      : id
        ? await getSessionBundleById(id)
        : null;

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
