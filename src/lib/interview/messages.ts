import type { UIMessage } from "ai";

type TextPart = {
  type: string;
  text?: string;
};

export function getMessageText(message: UIMessage) {
  const maybeParts = "parts" in message ? message.parts : undefined;

  if (Array.isArray(maybeParts)) {
    return maybeParts
      .map((part) => {
        const textPart = part as TextPart;
        return textPart.type === "text" ? textPart.text ?? "" : "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  const maybeContent = (message as unknown as { content?: unknown }).content;
  return typeof maybeContent === "string" ? maybeContent.trim() : "";
}

export function getLatestUserMessage(messages: UIMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user");
}
