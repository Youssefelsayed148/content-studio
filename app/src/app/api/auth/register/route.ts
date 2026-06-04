import { NextResponse } from "next/server";
import { createUserAndWorkspace, createAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, name, workspaceName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const result = createUserAndWorkspace(
      email,
      password,
      name || email.split("@")[0],
      workspaceName || `${email.split("@")[0]}'s Workspace`
    );

    const cookie = createAuthCookie(result.token);

    return NextResponse.json(
      { success: true, user: result.user },
      { headers: { "Set-Cookie": cookie } }
    );
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Registration failed" },
      { status: 500 }
    );
  }
}
