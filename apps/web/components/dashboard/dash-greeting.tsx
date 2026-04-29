export function DashGreeting({
  headline,
  subhead,
  status = "everything is running",
}: {
  headline: string;
  subhead: string;
  status?: string;
}) {
  return (
    <div className="mb-[40px]">
      <div className="inline-flex items-center gap-sm text-xs text-aliveDark mb-[18px]">
        <span className="w-[7px] h-[7px] rounded-full bg-alive animate-pulse" />
        {status}
      </div>
      <h1
        className="font-medium tracking-tight leading-[1.1] mb-[10px]"
        style={{ fontSize: "clamp(28px, 4vw, 40px)" }}
      dir="auto">
        {headline}
      </h1>
      <p className="text-md text-ink3 leading-[1.5]" dir="auto">{subhead}</p>
    </div>
  );
}
