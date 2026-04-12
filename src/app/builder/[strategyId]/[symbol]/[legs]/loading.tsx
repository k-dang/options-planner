export default function Loading() {
  return (
    <div className="grain grid-bg relative min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <section className="space-y-2">
          <div className="h-3 w-28 rounded bg-white/[0.05]" />
          <div className="h-10 w-80 rounded bg-white/[0.06]" />
          <div className="h-4 w-56 rounded bg-white/[0.04]" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="min-h-96 rounded-xl border border-white/[0.08] bg-white/[0.03]" />
          <div className="min-h-96 rounded-xl border border-white/[0.08] bg-white/[0.03]" />
        </section>
      </main>
    </div>
  );
}
