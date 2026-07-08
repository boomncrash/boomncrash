import { NextRequest } from "next/server";
import { createAccount } from "@/lib/auth/accounts";
import { validateEmail, validatePassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    const emailError = validateEmail(email);
    if (emailError) return Response.json({ error: emailError }, { status: 400 });
    const passwordError = validatePassword(password);
    if (passwordError) return Response.json({ error: passwordError }, { status: 400 });

    const session = await createAccount(email, password);
    const token = await createSessionToken(session);
    await setSessionCookie(token);

    return Response.json({ user: session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
