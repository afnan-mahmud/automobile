import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border p-6">
        <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
        <LoginForm />
      </div>
    </div>
  );
}
