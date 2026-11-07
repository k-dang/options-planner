"use client";

import { Check, RefreshCw, Trash2 } from "lucide-react";
import { useActionState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  closePositionAction,
  deletePositionAction,
  type PositionActionState,
  refreshAllOpenPositionsAction,
  refreshPositionAction,
} from "@/lib/position-actions";
import { cn } from "@/lib/utils";

const INITIAL_STATE: PositionActionState = {
  ok: true,
  message: null,
};

export function PositionActions({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled: boolean;
}) {
  const [refreshState, refreshAction, refreshPending] = useActionState(
    refreshPositionAction,
    INITIAL_STATE,
  );
  const [closeState, closeAction, closePending] = useActionState(
    closePositionAction,
    INITIAL_STATE,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePositionAction,
    INITIAL_STATE,
  );
  const activeMessage =
    [refreshState, closeState, deleteState].find(
      (state) => !state.ok && state.message,
    )?.message ?? null;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="inline-flex items-center gap-0.5 rounded-full border border-border/80 bg-linear-to-b from-card/60 to-card/30 p-1 shadow-[0_1px_0_0_oklch(1_0_0/0.04)_inset,0_8px_24px_-16px_oklch(0_0_0/0.6)] backdrop-blur-md">
        <form action={refreshAction}>
          <input type="hidden" name="id" value={id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon-xs"
            disabled={disabled || refreshPending}
            aria-label="Refresh mark"
            title="Refresh mark"
            className="size-7 rounded-full text-muted-foreground hover:bg-accent hover:text-primary"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn(
                "size-3.5",
                refreshPending && "animate-spin text-primary",
              )}
            />
          </Button>
        </form>
        <form action={closeAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="intent" value="close" />
          <Button
            type="submit"
            variant="ghost"
            size="icon-xs"
            disabled={disabled || closePending}
            aria-label="Close at market mark"
            title="Close at market mark"
            className="size-7 rounded-full text-muted-foreground hover:bg-accent hover:text-profit"
          >
            {closePending ? (
              <RefreshCw aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Check aria-hidden="true" className="size-3.5" />
            )}
          </Button>
        </form>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={deletePending}
                aria-label="Delete strategy"
                title="Delete strategy"
                className="size-7 rounded-full text-destructive hover:bg-destructive/15 hover:text-destructive"
              />
            }
          >
            {deletePending ? (
              <RefreshCw aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" className="size-3.5" />
            )}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete saved strategy?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {name} and its saved mark
                snapshots. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="intent" value="delete" />
                <AlertDialogAction
                  type="submit"
                  variant="destructive"
                  disabled={deletePending}
                >
                  {deletePending ? "Deleting" : "Delete"}
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {activeMessage ? (
        <p className="max-w-56 text-xs text-destructive">{activeMessage}</p>
      ) : null}
    </div>
  );
}

export function RefreshAllPositionsButton() {
  const [state, formAction, pending] = useActionState(
    refreshAllOpenPositionsAction,
    INITIAL_STATE,
  );

  return (
    <div className="flex min-w-56 flex-col items-end gap-1">
      <form action={formAction}>
        <Button type="submit" variant="outline" disabled={pending}>
          <RefreshCw className={cn(pending && "animate-spin")} />
          {pending ? "Refreshing" : "Refresh all"}
        </Button>
      </form>
      {state.message ? (
        <p
          className={
            state.ok
              ? "min-h-4 text-right text-xs text-muted-foreground"
              : "min-h-4 text-right text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      ) : (
        <span className="min-h-4" aria-hidden="true" />
      )}
    </div>
  );
}
