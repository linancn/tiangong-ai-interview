"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";

import { Thread } from "@/components/assistant-ui/thread";

export function CandidateInterviewChat({ token }: { token: string }) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: `/api/chat?token=${token}`,
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="h-screen bg-background">
        <Thread />
      </main>
    </AssistantRuntimeProvider>
  );
}
