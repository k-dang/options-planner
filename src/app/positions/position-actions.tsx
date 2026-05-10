"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { type RefreshPositionState, refreshPositionAction } from "./actions";

const INITIAL_STATE: RefreshPositionState = {
  ok: true,
  message: null,
};

export function PositionActions({
  id,
  disabled,
}: {
  id: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    refreshPositionAction,
    INITIAL_STATE,
  );

  return (
    <div className="flex min-w-36 flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={disabled || pending}
        >
          <RefreshCw className={pending ? "animate-spin" : undefined} />
          {pending ? "Refreshing" : "Refresh"}
        </Button>
      </form>
      {!state.ok && state.message ? (
        <p className="max-w-52 text-right text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
