export function SectionHeading({
  label,
  title,
  intro,
}: {
  label: string;
  title: string;
  intro?: string;
}) {
  return (
    <>
      <div className="inline-flex items-center gap-sm mb-md font-mono text-xs text-ink4 tracking-[0.2em]">
        <span className="w-[6px] h-[6px] rounded-full bg-ink" />
        {label}
      </div>
      <h2 className="text-[clamp(28px,4.5vw,42px)] font-medium tracking-[-0.025em] leading-[1.15] mb-md">
        {title}
      </h2>
      {intro ? (
        <p className="text-base text-ink3 max-w-[560px] leading-[1.55] mb-xl">
          {intro}
        </p>
      ) : null}
    </>
  );
}
