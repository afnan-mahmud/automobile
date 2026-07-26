import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
        <LoginForm />
      </div>
    </div>
  );
}
