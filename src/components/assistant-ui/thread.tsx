import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/tool-group";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import type { InterviewLanguage } from "@/lib/interview/types";
import {
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  getMcpAppFromToolPart,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  SquareIcon,
} from "lucide-react";
import type { FC } from "react";

type ThreadCopy = {
  welcomeTitle: string;
  welcomeDescription: string;
  waitingForQuestion: string;
  inputPlaceholder: string;
  inputLabel: string;
  send: string;
  stop: string;
  scrollToBottom: string;
};

const threadCopy = {
  zh: {
    welcomeTitle: "面试开始",
    welcomeDescription:
      "请先介绍一段最能代表你岗位匹配度的工作、项目或实践经历。",
    waitingForQuestion: "正在生成下一个问题",
    inputPlaceholder: "输入你的回答...",
    inputLabel: "消息输入",
    send: "发送",
    stop: "停止生成",
    scrollToBottom: "回到底部",
  },
  en: {
    welcomeTitle: "Interview started",
    welcomeDescription:
      "Start with a work, research, project, or practical experience that best shows your fit for this role.",
    waitingForQuestion: "Drafting the next question",
    inputPlaceholder: "Type your answer...",
    inputLabel: "Message input",
    send: "Send",
    stop: "Stop",
    scrollToBottom: "Scroll to bottom",
  },
} satisfies Record<InterviewLanguage, ThreadCopy>;

type ThreadProps = {
  language: InterviewLanguage;
};

export const Thread: FC<ThreadProps> = ({ language }) => {
  const copy = threadCopy[language];

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-full flex-col bg-muted/30"
      style={{
        ["--thread-max-width" as string]: "48rem",
        ["--composer-radius" as string]: "18px",
        ["--composer-padding" as string]: "10px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div className="mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-6">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome copy={copy} />
          </AuiIf>

          <div
            data-slot="aui_message-group"
            className="mb-10 flex flex-col gap-y-8 empty:hidden"
          >
            <ThreadPrimitive.Messages>
              {() => <ThreadMessage copy={copy} />}
            </ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 mt-auto flex flex-col gap-4 overflow-visible rounded-t-(--composer-radius) bg-background/90 pb-4 backdrop-blur md:pb-6">
            <ThreadScrollToBottom copy={copy} />
            <Composer copy={copy} />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC<{ copy: ThreadCopy }> = ({ copy }) => {
  const role = useAuiState((s) => s.message.role);

  if (role === "user") return <UserMessage />;
  return <AssistantMessage copy={copy} />;
};

const ThreadScrollToBottom: FC<{ copy: ThreadCopy }> = ({ copy }) => {
  return (
      <ThreadPrimitive.ScrollToBottom render={<TooltipIconButton tooltip={copy.scrollToBottom} variant="outline" className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full bg-card p-4 shadow-sm disabled:invisible dark:border-border dark:bg-background dark:hover:bg-accent" />}><ArrowDownIcon /></ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC<{ copy: ThreadCopy }> = ({ copy }) => {
  return (
    <div className="aui-thread-welcome-root my-auto flex grow flex-col">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
          <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both font-semibold text-3xl tracking-tight duration-200">
            {copy.welcomeTitle}
          </h1>
          <p className="aui-thread-welcome-message-inner mt-3 max-w-2xl fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground text-lg leading-7 delay-75 duration-200">
            {copy.welcomeDescription}
          </p>
        </div>
      </div>
    </div>
  );
};

const Composer: FC<{ copy: ThreadCopy }> = ({ copy }) => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <div
        data-slot="aui_composer-shell"
        className="flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-card p-(--composer-padding) shadow-sm transition-shadow focus-within:border-ring/75 focus-within:ring-2 focus-within:ring-ring/20"
      >
        <ComposerPrimitive.Input
          placeholder={copy.inputPlaceholder}
          className="aui-composer-input max-h-36 min-h-12 w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground/80"
          rows={1}
          autoFocus
          aria-label={copy.inputLabel}
        />
        <ComposerAction copy={copy} />
      </div>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC<{ copy: ThreadCopy }> = ({ copy }) => {
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-end">
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send render={<TooltipIconButton tooltip={copy.send} side="bottom" type="button" variant="default" size="icon" className="aui-composer-send size-8 rounded-full" aria-label={copy.send} />}><ArrowUpIcon className="aui-composer-send-icon size-4" /></ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel render={<Button type="button" variant="default" size="icon" className="aui-composer-cancel size-8 rounded-full" aria-label={copy.stop} />}><SquareIcon className="aui-composer-cancel-icon size-3 fill-current" /></ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC<{ copy: ThreadCopy }> = ({ copy }) => {
  const showTypingIndicator = useAuiState((s) => {
    if (s.message.status?.type !== "running") return false;

    return !s.message.parts.some((part) => {
      if (part.type === "text") return part.text.trim().length > 0;
      return true;
    });
  });

  if (showTypingIndicator) {
    return (
      <MessagePrimitive.Root
        data-slot="aui_assistant-message-root"
        data-role="assistant"
        className="fade-in slide-in-from-bottom-1 relative animate-in duration-150 [contain-intrinsic-size:auto_60px] [content-visibility:auto]"
      >
        <AssistantTypingIndicator label={copy.waitingForQuestion} />
      </MessagePrimitive.Root>
    );
  }

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 relative animate-in duration-150 [contain-intrinsic-size:auto_300px] [content-visibility:auto]"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="wrap-break-word rounded-lg border bg-card px-4 py-3 text-foreground leading-relaxed shadow-sm"
      >
        <MessagePrimitive.GroupedParts
          groupBy={(part) => {
            if (part.type === "reasoning")
              return ["group-chainOfThought", "group-reasoning"];
            if (part.type === "tool-call") {
              if (getMcpAppFromToolPart(part)) return null;
              return ["group-chainOfThought", "group-tool"];
            }
            return null;
          }}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <div data-slot="aui_chain-of-thought">{children}</div>;
              case "group-reasoning": {
                const running = part.status.type === "running";
                return (
                  <ReasoningRoot defaultOpen={running}>
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case "group-tool":
                return (
                  <ToolGroupRoot>
                    <ToolGroupTrigger
                      count={part.indices.length}
                      active={part.status.type === "running"}
                    />
                    <ToolGroupContent>{children}</ToolGroupContent>
                  </ToolGroupRoot>
                );
              case "text":
                return <MarkdownText />;
              case "reasoning":
                return <Reasoning {...part} />;
              case "tool-call":
                return part.toolUI ?? <ToolFallback {...part} />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantTypingIndicator: FC<{ label: string }> = ({ label }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="aui-assistant-typing inline-flex h-10 w-fit items-center gap-1.5 rounded-2xl border bg-card px-4 text-muted-foreground shadow-sm"
    >
      <span className="aui-typing-dot size-1.5 rounded-full bg-current" />
      <span className="aui-typing-dot size-1.5 rounded-full bg-current" />
      <span className="aui-typing-dot size-1.5 rounded-full bg-current" />
    </div>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 grid animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_60px] [content-visibility:auto] [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content wrap-break-word peer rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground shadow-sm empty:hidden">
          <MessagePrimitive.Parts />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};
