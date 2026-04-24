const TOTAL = 6;

export function OnboardingProgress({ step }: { step: number }) {
  const safe = Math.min(Math.max(step, 1), TOTAL);
  return (
    <div className="flex items-center justify-between mb-lg">
      <span className="font-mono text-xs text-ink4 tracking-[0.2em]">
        {String(safe).padStart(2, "0")} / 06
      </span>
      <div className="flex items-center gap-[4px]">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <span
            key={i}
            className={`w-[6px] h-[6px] rounded-full ${i < safe ? "bg-ink" : "bg-border"}`}
          />
        ))}
      </div>
    </div>
  );
}
