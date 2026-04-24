import { AuthCard } from "../../components/auth/auth-card";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-lg py-2xl">
      <AuthCard mode="signup" />
    </main>
  );
}
