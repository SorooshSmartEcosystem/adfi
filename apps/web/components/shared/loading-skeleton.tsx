// Lightweight skeletons for route-level loading.tsx files. Plain divs with
// a subtle pulse so users see structure instantly while data streams in,
// instead of a blank screen. No icons, no labels — empty by design,
// matching the v3 "looks empty when things are working" rule.

export function SkeletonBlock({
  height = 80,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface rounded-md animate-pulse ${className}`}
      style={{ height }}
    />
  );
}

export function SkeletonHero() {
  return (
    <div className="mb-[40px]">
      <div className="h-[20px] w-[180px] bg-surface rounded animate-pulse mb-md" />
      <div className="h-[36px] w-[260px] bg-surface rounded animate-pulse mb-sm" />
      <div className="h-[18px] w-[420px] max-w-[80%] bg-surface rounded animate-pulse" />
    </div>
  );
}

export function SkeletonCardGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg mb-xl">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} height={140} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} height={88} />
      ))}
    </div>
  );
}
