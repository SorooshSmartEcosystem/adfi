"use client";
import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@orb/auth/client";

type Status = "idle" | "sending" | "sent" | "error";

export default function AdminSignIn() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <main className="min-h-screen flex items-center justify-center px-lg">
        <div className="flex flex-col items-center gap-lg max-w-sm">
          <div className="flex items-center gap-md">
            <span className="inline-block w-sm h-sm rounded-full bg-alive" aria-hidden />
            <h1 className="text-2xl font-medium tracking-tight">ADFI admin</h1>
          </div>
          <p className="text-sm text-ink2 font-mono text-center">
            check your inbox — sign-in link sent to <br />
            <span className="text-ink">{email}</span>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-md w-full max-w-sm">
        <div className="flex items-center gap-md mb-lg">
          <span className="inline-block w-sm h-sm rounded-full bg-alive" aria-hidden />
          <h1 className="text-2xl font-medium tracking-tight">ADFI admin</h1>
        </div>
        <p className="text-xs font-mono text-ink3 uppercase tracking-widest">
          internal
        </p>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@adfi.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="px-md py-sm bg-surface border-hairline border-border rounded-md text-ink focus:outline-none focus:border-ink3"
          disabled={status === "sending"}
        />
        <button
          type="submit"
          disabled={status === "sending" || !email}
          className="px-md py-sm bg-ink text-bg rounded-md font-medium disabled:opacity-50"
        >
          {status === "sending" ? "sending..." : "sign in"}
        </button>
        {status === "error" && (
          <p className="text-sm text-urgent font-mono" role="alert">
            {errorMessage}
          </p>
        )}
      </form>
    </main>
  );
}
