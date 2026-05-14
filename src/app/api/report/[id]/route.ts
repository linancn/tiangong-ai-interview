import { NextResponse } from "next/server";

import { renderMarkdownReport } from "@/lib/interview/report";
import { requireAdminApiAuth } from "@/lib/server/admin-auth";
import {
  getSessionBundleById,
  listSessionMessages,
} from "@/lib/server/interviews";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Params) {
  try {
    const authError = await requireAdminApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const bundle = await getSessionBundleById(id);

    if (!bundle) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const messages = await listSessionMessages(bundle.session.id);
    const markdown =
      bundle.report.finalMarkdown ??
      renderMarkdownReport({
        roleName: bundle.interview.roleName,
        companyName: bundle.interview.companyName,
        candidateName: bundle.session.candidateName,
        rubric: bundle.interview.rubric,
        reportState: bundle.reportState,
        transcript: messages,
      });

    return new NextResponse(markdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load report.",
      },
      { status: 500 },
    );
  }
}
