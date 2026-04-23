export default function AdminHome() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-md">
        <div className="flex items-center gap-md">
          <span
            className="inline-block w-sm h-sm rounded-full bg-alive"
            aria-hidden
          />
          <h1 className="text-2xl font-medium tracking-tight">ADFI Admin</h1>
        </div>
        <p className="text-sm text-ink3 font-mono">internal ops dashboard</p>
      </div>
    </main>
  );
}
