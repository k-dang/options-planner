"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { TickerCombobox } from "@/components/ticker-combobox";
import { Button } from "@/components/ui/button";
import {
  addWatchlistSymbolAction,
  removeWatchlistSymbolAction,
  type WatchlistActionState,
} from "@/lib/ticker-watchlist-actions";
import { cn } from "@/lib/utils";

const INITIAL_STATE: WatchlistActionState = {
  ok: true,
  message: null,
};

export function AddWatchlistSymbolForm() {
  const [state, formAction, pending] = useActionState(
    addWatchlistSymbolAction,
    INITIAL_STATE,
  );

  return (
    <div className="flex w-full max-w-md flex-col gap-1.5">
      <form action={formAction} className="flex items-center gap-2">
        <TickerCombobox
          defaultSymbol=""
          inputName="symbol"
          resetOnBlur={false}
        />
        <Button type="submit" disabled={pending}>
          {pending ? (
            <RefreshCw aria-hidden="true" className="animate-spin" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Add
        </Button>
      </form>
      <p
        className={cn(
          "min-h-4 text-xs",
          state.ok ? "text-muted-foreground" : "text-destructive",
        )}
      >
        {state.message}
      </p>
    </div>
  );
}

export function RemoveWatchlistSymbolButton({
  id,
  symbol,
}: {
  id: string;
  symbol: string;
}) {
  const [state, formAction, pending] = useActionState(
    removeWatchlistSymbolAction,
    INITIAL_STATE,
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={`Remove ${symbol}`}
          title={`Remove ${symbol}`}
          className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
        >
          {pending ? (
            <RefreshCw aria-hidden="true" className="animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" />
          )}
        </Button>
      </form>
      {!state.ok && state.message ? (
        <p className="max-w-40 text-right text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
