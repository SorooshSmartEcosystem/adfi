export function LivePill({ label = "EVERYTHING IS RUNNING" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-[6px] px-md py-[4px] border-hairline border-border bg-white rounded-full font-mono text-[10px] text-aliveDark tracking-[0.15em]">
      <span className="w-[6px] h-[6px] rounded-full bg-alive animate-pulse" />
      {label}
    </span>
  );
}
