import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center bg-[#f4f1ea] px-6 text-[#1f2933]">
      <section className="mx-auto w-full max-w-5xl py-16">
        <p className="font-medium text-[#58616f]">Options Planner</p>
        <h1 className="mt-3 max-w-3xl font-semibold text-5xl tracking-normal">
          Model a trade idea from a generated options chain.
        </h1>
        <p className="mt-5 max-w-2xl text-[#58616f] text-lg leading-8">
          Start with a long call or long put, adjust the core contract inputs,
          and share the exact strategy state through the URL.
        </p>
        <Link
          className="mt-8 inline-flex rounded-md bg-[#1f2933] px-5 py-3 font-medium text-white hover:bg-[#334155]"
          href="/build/long-call/AAPL"
        >
          Open builder
        </Link>
      </section>
    </main>
  );
}
