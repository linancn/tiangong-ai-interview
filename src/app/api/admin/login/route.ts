import { NextResponse } from "next/server";

import {
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/server/admin-auth";
import { localUrl } from "@/lib/server/request-url";

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/admin";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const password = formData.get("password");
  const next = safeNextPath(formData.get("next"));

  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return NextResponse.redirect(
      localUrl(
        `/admin/login?error=1&next=${encodeURIComponent(next)}`,
        req,
      ),
      { status: 303 },
    );
  }

  const response = NextResponse.redirect(localUrl(next, req), {
    status: 303,
  });
  setAdminSessionCookie(response);
  return response;
}
