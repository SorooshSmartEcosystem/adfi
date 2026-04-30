"use client";

import { useEffect, useMemo } from "react";
import { LANDING_BODY } from "./landing-body";
import { LANDING_SCRIPT } from "./landing-script";
import { LANDING_CSS } from "./landing-css";

export type LandingUser = {
  name: string;
  logoUrl: string | null;
};

// Client component. Renders the v4 prototype verbatim — body via
// dangerouslySetInnerHTML, prototype CSS via inline <style>. Scripts
// embedded through JSX dangerouslySetInnerHTML are NOT executed by
// React during SSR or hydration, which is why every animation was
// frozen on the deployed page.
//
// Fix: inject the script via document.createElement after the body HTML
// is in the DOM. The animation script is idempotent enough that re-runs
// from React Strict Mode don't break anything (each IIFE picks up its
// elements fresh and stops cleanly when off-screen).
//
// CSS stays inline so the prototype's body/html rules only apply while
// the landing is mounted (Next App Router CSS imports are app-wide).
export function LandingV4({ user }: { user?: LandingUser | null }) {
  const body = useMemo(() => {
    if (!user) return LANDING_BODY;
    const initials =
      user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("") || "—";
    const safeName = escapeHtml(user.name);
    const avatar = user.logoUrl
      ? `<img src="${escapeHtml(user.logoUrl)}" alt="" class="nav-user-avatar" />`
      : `<span class="nav-user-avatar nav-user-initials">${escapeHtml(initials)}</span>`;
    // Pill is now a button that opens a dropdown (dashboard / logout).
    // Wrapping div positions the dropdown beneath the button.
    const pill = `<div class="nav-user-wrap">
      <button type="button" class="nav-user" id="nav-user-trigger" aria-haspopup="true" aria-expanded="false" aria-controls="nav-user-drawer">${avatar}<span class="nav-user-name">${safeName}</span><span class="nav-user-caret" aria-hidden="true">▾</span></button>
      <div class="nav-user-drawer" id="nav-user-drawer" role="menu" hidden>
        <a href="/dashboard" class="nav-user-drawer-link" role="menuitem">go to dashboard</a>
        <form action="/auth/signout" method="post" class="nav-user-drawer-form" role="none">
          <button type="submit" class="nav-user-drawer-link nav-user-drawer-logout" role="menuitem">log out</button>
        </form>
      </div>
    </div>`;
    let next = LANDING_BODY.replace(
      /<a href="\/download" class="nav-cta">get the app<\/a>/,
      `<a href="/download" class="nav-cta">get the app</a>${pill}`,
    );
    // Strip the inline + drawer 'sign in' links — already authed users
    // have no use for them, the pill drawer carries 'log out' instead.
    next = next.replace(
      /<a href="\/signin" class="nav-link">sign in<\/a>\s*/g,
      "",
    );
    next = next.replace(
      /<a href="\/signin" class="nav-drawer-link">sign in<\/a>\s*/g,
      "",
    );
    return next;
  }, [user]);

  useEffect(() => {
    const script = document.createElement("script");
    script.text = LANDING_SCRIPT;
    script.id = "landing-v4-anim";
    document.body.appendChild(script);
    return () => {
      const existing = document.getElementById("landing-v4-anim");
      if (existing) existing.remove();
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
