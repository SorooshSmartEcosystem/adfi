"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@orb/auth/client";
import { Orb } from "../shared/orb";

type Mode = "login" | "signup";
type Status = "idle" | "sending" | "sent" | "error";

function detectKind(value: string): "email" | "phone" | "invalid" {
  if (value.includes("@")) return "email";
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10) return "phone";
  return "invalid";
}

export function AuthCard({ mode }: { mode: Mode }) {
  const [input, setInput] = useState("");
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

      <form onSubmit={handleSubmit} className="flex flex-col">
        <label
          htmlFor="auth-input"
          className="font-mono text-xs text-ink4 tracking-[0.15em] uppercase mb-sm"
        >
          phone or email
        </label>
        <input
          id="auth-input"
          type="text"
          required
          autoFocus
          autoComplete={
            input.includes("@") ? "email" : "tel"
          }
          placeholder="+1 (416) 555-0172 or you@example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="px-md py-[12px] bg-bg border-hairline border-border rounded-md text-ink focus:outline-none focus:border-ink mb-md"
          disabled={status === "sending"}
        />

        <button
          type="submit"
          disabled={status === "sending" || !input}
          className="w-full bg-ink text-white py-[13px] rounded-full text-md font-medium disabled:opacity-40"
        >
          {status === "sending" ? "one second..." : submitLabel}
        </button>
      </form>

      <div className="flex items-center gap-md my-lg">
        <span className="flex-1 h-px bg-border" />
        <span className="font-mono text-xs text-ink4 tracking-[0.2em]">OR</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={status === "sending"}
        className="w-full bg-transparent text-ink py-[13px] rounded-full text-md font-medium border-hairline border-border hover:border-ink transition-colors disabled:opacity-40"
      >
        continue with google
      </button>

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
