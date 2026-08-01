"use client";

import { Toast } from "@base-ui/react/toast";
import { CircleCheckIcon, OctagonXIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error";
type ToastData = { kind: ToastKind };

const toastManager = Toast.createToastManager<ToastData>();

const toast = {
  success(title: string) {
    toastManager.add({
      title,
      type: "success",
      priority: "low",
      data: { kind: "success" },
    });
  },
  error(title: string) {
    toastManager.add({
      title,
      type: "error",
      priority: "high",
      data: { kind: "error" },
    });
  },
};

function Toaster() {
  return (
    <Toast.Provider limit={3} toastManager={toastManager}>
      <ToastList />
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager<ToastData>();

  return (
    <Toast.Portal>
      <Toast.Viewport className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none sm:right-6 sm:bottom-6">
        {toasts.map((toastItem) => {
          const isError = toastItem.data?.kind === "error";
          const Icon = isError ? OctagonXIcon : CircleCheckIcon;

          return (
            <Toast.Root
              className="pointer-events-auto flex items-center gap-3 rounded-4xl border border-border bg-popover px-4 py-3 text-popover-foreground transition-[opacity,transform] duration-200 data-ending-style:translate-y-2 data-ending-style:opacity-0 data-limited:hidden data-starting-style:translate-y-2 data-starting-style:opacity-0 motion-reduce:transition-none motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-starting-style:translate-y-0"
              key={toastItem.id}
              toast={toastItem}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0",
                  isError ? "text-destructive" : "text-foreground",
                )}
              />
              <Toast.Title className="font-sans text-sm font-medium" />
            </Toast.Root>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export { Toaster, toast };
