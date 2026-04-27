import { LANDING_BODY } from "./landing-body";
import { LANDING_SCRIPT } from "./landing-script";
import { LANDING_CSS } from "./landing-css";

// Server component. Renders the v4 prototype verbatim — body via
// dangerouslySetInnerHTML, prototype CSS via inline <style>, and the
// auto-loop animation as an inline <script> tag.
//
// Why inline CSS instead of `import "./landing.css"`: in Next App Router
// CSS imports are app-wide globals. The prototype declares body/html
// rules (background, overflow, font) that we don't want leaking onto
// the dashboard. An inline <style> only exists while the component is
// mounted, so navigating away cleans it up.
export function LandingV4() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: LANDING_BODY }} />
      <script dangerouslySetInnerHTML={{ __html: LANDING_SCRIPT }} />
    </>
  );
}
