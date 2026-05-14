import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";

type RuntimeConfig = {
  apiKey: string;
  baseURL?: string;
  model: string;
};

let cachedConfig: RuntimeConfig | null = null;
let cachedFileConfig: Record<string, unknown> | null = null;

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getFileConfig() {
  if (cachedFileConfig) return cachedFileConfig;
  try {
    cachedFileConfig = parse(
      readFileSync(join(process.cwd(), "config.toml"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    cachedFileConfig = {};
  }

  return cachedFileConfig;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const fileConfig = getFileConfig();
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

export function getAdminPassword() {
  const fileConfig = getFileConfig();
  const password =
    readString(fileConfig.admin_password) || process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "Missing admin password. Set admin_password in config.toml or ADMIN_PASSWORD.",
    );
  }

  return password;
}

export function getDeploymentUrl() {
  const fileConfig = getFileConfig();
  const value =
    readString(fileConfig.deployment_url) ||
    readString(fileConfig.app_url) ||
    readString(fileConfig.public_base_url) ||
    process.env.DEPLOYMENT_URL ||
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (!value) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "Invalid deployment_url. Use an absolute URL, for example https://thuenv.tiangong.world:3001.",
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid deployment_url. Only http and https are supported.");
  }

  return value.replace(/\/+$/, "");
}
