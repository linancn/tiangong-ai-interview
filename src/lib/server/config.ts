import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";

type RuntimeConfig = {
  apiKey: string;
  baseURL?: string;
  model: string;
};

let cachedConfig: RuntimeConfig | null = null;

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  let fileConfig: Record<string, unknown> = {};
  try {
    fileConfig = parse(
      readFileSync(join(process.cwd(), "config.toml"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    fileConfig = {};
  }

  const apiKey =
    readString(fileConfig.api_key) ||
    readString(fileConfig.env_key) ||
    process.env.OPENAI_API_KEY;
  const baseURL =
    readString(fileConfig.base_url) || process.env.OPENAI_BASE_URL || undefined;
  const model =
    readString(fileConfig.model) || process.env.OPENAI_MODEL || "gpt-5.4-mini";

  if (!apiKey) {
    throw new Error(
      "Missing OpenAI API key. Set api_key/env_key in config.toml or OPENAI_API_KEY.",
    );
  }

  cachedConfig = { apiKey, baseURL, model };
  return cachedConfig;
}
