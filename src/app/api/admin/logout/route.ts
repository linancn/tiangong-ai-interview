import { NextResponse } from "next/server";

import { clearAdminSessionCookie } from "@/lib/server/admin-auth";
import { localUrl } from "@/lib/server/request-url";

export async function POST(req: Request) {
  const response = NextResponse.redirect(localUrl("/admin/login", req), {
    status: 303,
  });
  clearAdminSessionCookie(response);
  return response;
}
