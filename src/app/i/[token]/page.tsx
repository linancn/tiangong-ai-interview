import { notFound } from "next/navigation";

import { CandidateInterviewChat } from "@/components/interview/candidate-interview-chat";
import { getSessionBundleByToken } from "@/lib/server/interviews";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CandidatePage({ params }: PageProps) {
  const { token } = await params;
  const bundle = await getSessionBundleByToken(token).catch(() => null);

  if (!bundle) notFound();

  return (
    <CandidateInterviewChat
      token={token}
      language={bundle.interview.language}
      status={bundle.session.status}
      roleName={bundle.interview.roleName}
      companyName={bundle.interview.companyName}
    />
  );
}
