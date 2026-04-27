"use client";

import { useEffect } from "react";
import { LANDING_BODY } from "./landing-body";
import { LANDING_SCRIPT } from "./landing-script";
import { LANDING_CSS } from "./landing-css";

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
export function LandingV4() {
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
      <div dangerouslySetInnerHTML={{ __html: LANDING_BODY }} />
    </>
  );
}
