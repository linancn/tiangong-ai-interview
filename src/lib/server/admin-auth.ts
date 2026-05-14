import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { getAdminPassword } from "./config";

const ADMIN_SESSION_COOKIE = "tiangong_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const secureCookie = process.env.ADMIN_COOKIE_SECURE === "true";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

function expectedSessionToken() {
  return hash(`tiangong-interview-admin:${getAdminPassword()}`);
}

export function verifyAdminPassword(input: string) {
  return safeEqual(hash(input), hash(getAdminPassword()));
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return Boolean(token && safeEqual(token, expectedSessionToken()));
}

export async function requireAdminPageAuth(nextPath: string) {
  if (!(await isAdminAuthenticated())) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
}

export async function requireAdminApiAuth() {
  if (await isAdminAuthenticated()) return null;

  return NextResponse.json(
    { error: "Admin authentication required." },
    { status: 401 },
  );
}

export function setAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, expectedSessionToken(), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: secureCookie,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: secureCookie,
  });
}
