"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";

import { Thread } from "@/components/assistant-ui/thread";
import { ReportProgressPanel } from "@/components/interview/report-progress-panel";

export function CandidateInterviewChat({ token }: { token: string }) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: `/api/chat?token=${token}`,
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-h-[65vh] border-border border-b lg:h-screen lg:border-r lg:border-b-0">
          <Thread />
        </main>

        <aside className="bg-muted/20 p-4 lg:h-screen lg:overflow-y-auto">
          <ReportProgressPanel token={token} />
        </aside>
      </div>
    </AssistantRuntimeProvider>
  );
}
