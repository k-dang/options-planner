"use client";

import { useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";

export default function OptimizeError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center px-6 py-8">
        <section
          aria-labelledby="optimizer-error-heading"
          className="w-full rounded-xl bg-card p-6 ring-1 ring-border"
          role="alert"
        >
          <h1
            className="text-xl font-semibold text-balance"
            id="optimizer-error-heading"
          >
            Strategy data is temporarily unavailable
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground text-pretty">
            The optimizer could not load the latest underlying and options-chain
            data. Your browser is fine; retry the data request when you are
            ready.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              disabled={isPending}
              onClick={() => startTransition(unstable_retry)}
            >
              {isPending ? "Retrying…" : "Try again"}
            </Button>
            {error.digest ? (
              <span className="font-mono text-xs text-muted-foreground">
                Reference {error.digest}
              </span>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
