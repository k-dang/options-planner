"use client";

import { Bug, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DebugDrawerPanel = {
  title: string;
  value: string;
};

export type DebugDrawerSummaryItem = {
  label: string;
  value: string;
};

export function DebugDrawer({
  closeLabel,
  open,
  openLabel,
  panels,
  summary,
  subtitle,
  title,
  onClose,
  onOpen,
}: {
  closeLabel: string;
  open: boolean;
  openLabel: string;
  panels: DebugDrawerPanel[];
  summary?: DebugDrawerSummaryItem[];
  subtitle?: string;
  title: string;
  onClose: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <Button
        aria-expanded={open}
        aria-label={openLabel}
        className="fixed right-5 bottom-5 z-40 shadow-lg"
        size="icon"
        type="button"
        variant="outline"
        onClick={onOpen}
      >
        <Bug />
      </Button>
      {open ? (
        <>
          <Button
            aria-label={`${closeLabel} backdrop`}
            className="fixed inset-0 z-40 h-full w-full rounded-none bg-background/40 p-0 hover:bg-background/40"
            type="button"
            variant="ghost"
            onClick={onClose}
          />
          <aside className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-2xl flex-col border-l bg-background shadow-xl">
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-semibold">{title}</p>
                {subtitle ? (
                  <p className="text-muted-foreground text-sm">{subtitle}</p>
                ) : null}
              </div>
              <Button
                aria-label={closeLabel}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={onClose}
              >
                <X />
              </Button>
            </header>
            <div className="grid flex-1 gap-4 overflow-auto p-4">
              {summary?.length ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  {summary.map((item) => (
                    <SummaryRow
                      key={`${item.label}-${item.value}`}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </dl>
              ) : null}
              {panels.map((panel) => (
                <DebugJson
                  key={panel.title}
                  title={panel.title}
                  value={panel.value}
                />
              ))}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

function DebugJson({ title, value }: { title: string; value: string }) {
  return (
    <div className="grid gap-2">
      <h2 className="font-semibold text-sm">{title}</h2>
      <pre className="max-h-[45dvh] overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
        {value}
      </pre>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
