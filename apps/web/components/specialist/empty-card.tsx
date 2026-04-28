import Link from "next/link";

export function EmptyCard({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="bg-white border-hairline border-border rounded-2xl px-xl py-xl">
      <div className="text-md font-medium mb-sm">{title}</div>
      <p className="text-sm text-ink3 leading-relaxed mb-md">{body}</p>
      <Link
        href={href}
        className="inline-block bg-ink text-white text-xs font-medium px-md py-[8px] rounded-full hover:opacity-85 transition-opacity"
      >
        {cta}
      </Link>
    </div>
  );
}
