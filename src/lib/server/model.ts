import { createOpenAI } from "@ai-sdk/openai";

import { getRuntimeConfig } from "./config";

export function getInterviewModel() {
  const config = getRuntimeConfig();
  const provider = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return provider.chat(config.model);
}
