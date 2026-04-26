// Mini line chart for KPI cards. Auto-scales to fit; degenerate data
// (one or zero points, all-same values) renders as a flat line.
export function Sparkline({
  values,
  className = "",
}: {
  values: number[];
  className?: string;
}) {
  const points = values.length >= 2 ? values : [0, 0];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = 80 / Math.max(1, points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * step;
      const y = 24 - ((v - min) / range) * 20 - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className={className}
      viewBox="0 0 80 28"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
