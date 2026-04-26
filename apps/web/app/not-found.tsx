import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-lg">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-md">
        <span
          className="w-[28px] h-[28px] rounded-full mb-sm"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #4a4a4a 0%, #1a1a1a 60%, #000 100%)",
          }}
        />
        <p className="font-mono text-xs text-ink4 tracking-widest uppercase">
          404
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          that page isn&apos;t here.
        </h1>
        <p className="text-md text-ink3 leading-relaxed">
          you may have followed an old link, or i moved this somewhere else.
          head back to the dashboard or sign in.
        </p>
        <div className="flex items-center gap-md mt-md">
          <Link
            href="/"
            className="bg-ink text-white font-mono text-xs px-md py-[7px] rounded-full"
          >
            home →
          </Link>
          <Link
            href="/dashboard"
            className="font-mono text-xs text-ink2 border-hairline border-border rounded-full px-md py-[6px] hover:border-ink hover:text-ink transition-colors"
          >
            dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
