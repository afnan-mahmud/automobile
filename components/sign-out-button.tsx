"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
      onClick={() => signOut({ callbackUrl: "/login" })}
      title="Logout"
    >
      <LogOut className="size-5" />
      <span className="sr-only">Sign out</span>
    </Button>
  );
}
