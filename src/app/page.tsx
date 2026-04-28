import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center bg-background px-6 text-foreground">
      <section className="mx-auto w-full max-w-5xl py-16">
        <p className="font-medium text-muted-foreground">Options Planner</p>
        <h1 className="mt-3 max-w-3xl font-semibold text-5xl tracking-normal">
          Model a trade idea from a generated options chain.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          Build supported options strategies manually or scan generated
          candidates across strategy families with risk and expiration filters.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            nativeButton={false}
            size="lg"
            render={<Link href="/optimize" />}
          >
            Open optimizer
          </Button>
        </div>
      </section>
    </main>
  );
}
