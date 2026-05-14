"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";

import { Thread } from "@/components/assistant-ui/thread";
import type { InterviewLanguage } from "@/lib/interview/types";

type CandidateInterviewChatProps = {
  token: string;
  language: InterviewLanguage;
  roleName: string;
  companyName?: string | null;
};

const candidateCopy = {
  zh: {
    product: "天工面试",
    status: "进行中",
  },
  en: {
    product: "Tiangong Interview",
    status: "In progress",
  },
} satisfies Record<InterviewLanguage, Record<string, string>>;

export function CandidateInterviewChat({
  token,
  language,
  roleName,
  companyName,
}: CandidateInterviewChatProps) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: `/api/chat?token=${token}`,
    }),
  });
  const copy = candidateCopy[language];

  return (
    <AssistantRuntimeProvider runtime={runtime}>
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
              {copy.status}
            </div>
          </div>
        </header>
        <section className="min-h-0 flex-1">
          <Thread language={language} />
        </section>
      </main>
    </AssistantRuntimeProvider>
  );
}
