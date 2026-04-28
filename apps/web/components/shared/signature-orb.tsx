// Small breathing orb used as a per-page signature on every specialist
// page. Two faint rings ripple out, the orb itself breathes 1.0 → 1.06.
// Pure CSS — keyframes live in app/globals.css under the
// "Specialist page signature orb" section.

export function SignatureOrb({ size = 32 }: { size?: number }) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full sig-ring" />
      <div className="absolute inset-0 rounded-full sig-ring sig-ring-delayed" />
      <div className="relative w-full h-full rounded-full sig-orb z-[2]" />
    </div>
  );
}
