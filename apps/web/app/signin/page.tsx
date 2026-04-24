import { AuthCard } from "../../components/auth/auth-card";
import { AuthHomeLink } from "../../components/auth/auth-home-link";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-lg py-2xl">
      <AuthHomeLink />
      <AuthCard mode="login" />
    </main>
  );
}
