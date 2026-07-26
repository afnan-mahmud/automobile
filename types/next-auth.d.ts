import type { Role } from "@/models/User";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      employeeId?: string | null;
      name?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    employeeId?: string | null;
  }
}
