"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@orb/auth/client";
import { Orb } from "../shared/orb";

type Mode = "login" | "signup";
type Status = "idle" | "sending" | "sent" | "error";

// Official Google "G" mark — required by their brand guidelines whenever
// "Sign in with Google" is offered. Inline SVG so we don't ship a fetch.
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.591.102-1.166.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.581C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function detectKind(value: string): "email" | "phone" | "invalid" {
  if (value.includes("@")) return "email";
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10) return "phone";
  return "invalid";
}

export function AuthCard({ mode }: { mode: Mode }) {
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const kind = detectKind(input);
    if (kind === "invalid") {
      setStatus("error");
      setErrorMessage("enter an email or phone number.");
      return;
    }
    setStatus("sending");
    setErrorMessage("");

    const supabase = createBrowserClient();
    const nextParam = mode === "signup" ? "?next=/onboarding" : "";
    const emailRedirectTo = `${window.location.origin}/auth/callback${nextParam}`;

    // Password fallback — used by the Meta App Review test account
    // (passwordless via magic link doesn't fit a reviewer's workflow
    // since they can't open our Gmail). When the user explicitly opens
    // the password field and types one in, we route through
    // signInWithPassword instead of OTP.
    if (kind === "email" && showPassword && password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: input.trim(),
        password,
      });
      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
      } else {
        // Hard nav so middleware sees the new session cookie.
        window.location.href = "/dashboard";
      }
      return;
    }

    const { error } =
      kind === "email"
        ? await supabase.auth.signInWithOtp({
            email: input.trim(),
            options: { emailRedirectTo },
          })
        : await supabase.auth.signInWithOtp({
            phone: "+" + input.replace(/\D/g, ""),
          });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function handleGoogle() {
    setStatus("sending");
    const supabase = createBrowserClient();
    const nextParam = mode === "signup" ? "?next=/onboarding" : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${nextParam}`,
      },
    });
    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="w-full max-w-[420px] bg-white border-hairline border-border rounded-[16px] p-[20px] text-center">
        <div className="mx-auto mb-lg flex justify-center">
          <Orb size="md" ring={false} />
        </div>
        <h2 className="text-2xl font-medium tracking-tight mb-sm">
          check your inbox.
        </h2>
        <p className="text-sm text-ink3 leading-[1.55]">
          i sent a sign-in link to{" "}
          <span className="text-ink font-medium">{input}</span>. tap it and
          you&apos;re in.
        </p>
      </div>
    );
  }

  const title = mode === "login" ? "welcome back." : "let's get you hired.";
  const sub =
    mode === "login"
      ? "sign in to adfi."
      : "start your 7-day free trial. no charge until it's working.";
  const submitLabel = mode === "login" ? "send login code" : "continue →";

  return (
    <div className="w-full max-w-[420px] bg-white border-hairline border-border rounded-[16px] p-[20px]">
      <div className="mx-auto mb-lg flex justify-center">
        <Orb size="md" />
      </div>

      <h2 className="text-2xl font-medium tracking-tight mb-sm text-center">
        {title}
      </h2>
      <p className="text-sm text-ink3 text-center mb-lg">{sub}</p>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={status === "sending"}
        className="w-full flex items-center justify-center gap-sm bg-white text-ink py-[13px] rounded-full text-md font-medium border-hairline border-border hover:border-ink transition-colors disabled:opacity-40"
      >
        <GoogleG />
        <span>continue with google</span>
      </button>

      <div className="flex items-center gap-md my-lg">
        <span className="flex-1 h-px bg-border" />
        <span className="text-xs text-ink4">or use phone / email</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <label htmlFor="auth-input" className="text-xs text-ink4 mb-sm">
          phone or email
        </label>
        <input
          id="auth-input"
          type="text"
          required
          autoComplete={
            input.includes("@") ? "email" : "tel"
          }
          placeholder="+1 (416) 555-0172 or you@example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="px-md py-[12px] bg-bg border-hairline border-border rounded-md text-ink focus:outline-none focus:border-ink mb-md"
          disabled={status === "sending"}
        />

        {showPassword ? (
          <input
            id="auth-password"
            type="password"
            autoComplete="current-password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-md py-[12px] bg-bg border-hairline border-border rounded-md text-ink focus:outline-none focus:border-ink mb-md"
            disabled={status === "sending"}
          />
        ) : null}

        <button
          type="submit"
          disabled={status === "sending" || !input || (showPassword && !password)}
          className="w-full bg-ink text-white py-[13px] rounded-full text-md font-medium disabled:opacity-40"
        >
          {status === "sending"
            ? "one second..."
            : showPassword
              ? "sign in"
              : submitLabel}
        </button>
      </form>

      {/* Quiet password fallback. Used by Meta App Review reviewers
          (and anyone else who explicitly wants password auth). Hidden
          by default so the magic-link path stays the obvious one. */}
      {input.includes("@") ? (
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="text-xs text-ink4 hover:text-ink2 mt-md block mx-auto"
        >
          {showPassword
            ? "use magic link instead"
            : "sign in with password"}
        </button>
      ) : null}

      {status === "error" && errorMessage ? (
        <p className="text-sm text-urgent font-mono mt-md text-center" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="text-center text-sm text-ink3 mt-lg">
        {mode === "login" ? (
          <>
            don&apos;t have an account?{" "}
            <Link href="/signup" className="text-ink underline">
              sign up
            </Link>
          </>
        ) : (
          <>
            already have an account?{" "}
            <Link href="/signin" className="text-ink underline">
              log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
