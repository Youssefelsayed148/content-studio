import { getDb, ensureSchema } from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "content-studio-dev-secret-change-in-production";
const JWT_EXPIRY = "7d";
const SALT_ROUNDS = 10;

export interface AuthUser {
  id: string;
  workspace_id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
}

export interface AuthPayload {
  userId: string;
  workspaceId: string;
  email: string;
  role: string;
}

// Hash a password
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

// Verify a password against a hash
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Generate a JWT token
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verify and decode a JWT token
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

// Create a new user + workspace (for registration)
export function createUserAndWorkspace(
  email: string,
  password: string,
  name: string,
  workspaceName: string
): { user: AuthUser; token: string } {
  const db = getDb();
  ensureSchema();

  const workspaceId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  db.prepare(
    "INSERT INTO workspaces (id, name, slug, plan, status) VALUES (?, ?, ?, 'free', 'active')"
  ).run(workspaceId, workspaceName, workspaceName.toLowerCase().replace(/\s+/g, "-"));

  db.prepare(
    "INSERT INTO users (id, workspace_id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?, 'owner')"
  ).run(userId, workspaceId, email, name, passwordHash);

  const token = generateToken({
    userId,
    workspaceId,
    email,
    role: "owner",
  });

  return {
    user: { id: userId, workspace_id: workspaceId, email, name, role: "owner" },
    token,
  };
}

// Authenticate user by email and password
export function authenticateUser(
  email: string,
  password: string
): { user: AuthUser; token: string } | null {
  const db = getDb();
  ensureSchema();

  const row: any = db.prepare(
    "SELECT id, workspace_id, email, name, password_hash, role FROM users WHERE email = ?"
  ).get(email);

  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;

  const token = generateToken({
    userId: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
  });

  return {
    user: {
      id: row.id,
      workspace_id: row.workspace_id,
      email: row.email,
      name: row.name || row.email.split("@")[0],
      role: row.role,
    },
    token,
  };
}

// Get user by ID
export function getUserById(userId: string): AuthUser | null {
  const db = getDb();
  const row: any = db.prepare(
    "SELECT id, workspace_id, email, name, role FROM users WHERE id = ?"
  ).get(userId);
  return row || null;
}

// Extract auth payload from request headers
export function getAuthFromRequest(request: Request): AuthPayload | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

// Create a cookie string for the token
export function createAuthCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearAuthCookie(): string {
  return "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax";
}
