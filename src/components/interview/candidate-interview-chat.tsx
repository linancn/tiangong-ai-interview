"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import type { ReactNode } from "react";

import { Thread } from "@/components/assistant-ui/thread";
import type { InterviewLanguage, InterviewStatus } from "@/lib/interview/types";

type CandidateInterviewChatProps = {
  token: string;
  language: InterviewLanguage;
  status: InterviewStatus;
  roleName: string;
  companyName?: string | null;
};

const candidateCopy = {
  zh: {
    product: "天工面试",
    inProgress: "进行中",
    finished: "已完成",
    completedTitle: "面试已完成",
    completedDescription: "感谢你的参与。",
  },
  en: {
    product: "Tiangong Interview",
    inProgress: "In progress",
    finished: "Completed",
    completedTitle: "Interview completed",
    completedDescription: "Thank you for participating.",
  },
} satisfies Record<InterviewLanguage, Record<string, string>>;

function CandidateShell({
  children,
  language,
  status,
  roleName,
  companyName,
}: Omit<CandidateInterviewChatProps, "token"> & {
  children: ReactNode;
}) {
  const copy = candidateCopy[language];

  return (
    <main className="flex h-screen flex-col bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{copy.product}</p>
            <h1 className="truncate font-medium text-sm">
              {companyName ? `${companyName} / ${roleName}` : roleName}
            </h1>
          </div>
          <div className="rounded-full border bg-background px-2.5 py-1 text-muted-foreground text-xs">
            {status === "finished" ? copy.finished : copy.inProgress}
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}

function ActiveCandidateChat({
  token,
  language,
  status,
  roleName,
  companyName,
}: CandidateInterviewChatProps) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: `/api/chat?token=${token}`,
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CandidateShell
        language={language}
        status={status}
        roleName={roleName}
        companyName={companyName}
      >
        <section className="min-h-0 flex-1">
          <Thread language={language} />
        </section>
      </CandidateShell>
    </AssistantRuntimeProvider>
  );
}

export function CandidateInterviewChat(props: CandidateInterviewChatProps) {
  const copy = candidateCopy[props.language];

  if (props.status === "finished") {
    return (
      <CandidateShell {...props}>
        <section className="flex min-h-0 flex-1 items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            <h2 className="font-semibold text-3xl tracking-tight">
              {copy.completedTitle}
            </h2>
            <p className="mt-3 text-muted-foreground text-lg leading-7">
              {copy.completedDescription}
            </p>
          </div>
        </section>
      </CandidateShell>
    );
  }

  return <ActiveCandidateChat {...props} />;
}
