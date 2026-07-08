import { NextRequest } from "next/server";
import { loginAccount } from "@/lib/auth/accounts";
import { validateEmail } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    const emailError = validateEmail(email);
    if (emailError) return Response.json({ error: emailError }, { status: 400 });
    if (!password) return Response.json({ error: "Password is required." }, { status: 400 });

    const session = await loginAccount(email, password);
    const token = await createSessionToken(session);
    await setSessionCookie(token);

    return Response.json({ user: session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return Response.json({ error: message }, { status: 401 });
  }
}
