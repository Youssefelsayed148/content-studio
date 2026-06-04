import { NextResponse } from "next/server";
import { authenticateUser, createAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = authenticateUser(email, password);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const cookie = createAuthCookie(result.token);

    return NextResponse.json(
      { success: true, user: result.user },
      { headers: { "Set-Cookie": cookie } }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Login failed" },
      { status: 500 }
    );
  }
}
