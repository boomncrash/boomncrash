import { NextRequest } from "next/server";

export function isAdminRequest(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return request.headers.get("x-admin-secret") === secret;
}

export function adminUnauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
