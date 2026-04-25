"use client";

// Mirrors the mobile Toggle primitive — 42×24 pill with a 20×20 thumb.
// Pure CSS animation; no JS state required beyond the controlled `on`.
export function Toggle({
  on,
  onChange,
  disabled,
  ariaLabel,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`relative w-[42px] h-[24px] rounded-full transition-colors shrink-0 ${
        on ? "bg-ink" : "bg-[#D5D2C5]"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform ${
          on ? "translate-x-[18px]" : ""
        }`}
      />
    </button>
  );
}
