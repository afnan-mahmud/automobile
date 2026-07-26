import type { Role } from "@/models/User";

/**
 * Manual mock for lib/auth.ts, used by integration tests via
 * `vi.mock("@/lib/auth")`. Real auth() relies on request-scoped cookies
 * (next/headers) that don't exist in a plain Vitest/node environment, so
 * tests drive the "current session" through setMockSession instead —
 * requireRole here mirrors the real implementation's rejection logic
 * exactly (throws when role isn't allowed) so role-enforcement tests
 * still exercise real behavior, just against a fake session.
 */
export type MockSession = {
  user: { id: string; role: Role; employeeId?: string | null; name?: string };
} | null;

let currentSession: MockSession = null;

export function setMockSession(session: MockSession) {
  currentSession = session;
}

export async function auth() {
  return currentSession;
}

export async function requireRole(allowedRoles: Role[]) {
  if (!currentSession?.user || !allowedRoles.includes(currentSession.user.role)) {
    throw new Error("Unauthorized");
  }
  return currentSession;
}

export async function requirePageRole(allowedRoles: Role[]) {
  return requireRole(allowedRoles);
}
