"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function PositionRowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function navigate() {
    router.push(href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate();
    }
  }

  return (
    <TableRow
      role="link"
      tabIndex={0}
      aria-label="View position in builder"
      onClick={navigate}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-pointer transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </TableRow>
  );
}

function stopPropagation(event: MouseEvent<HTMLTableCellElement>) {
  event.stopPropagation();
}

export function PositionRowActionsCell({ children }: { children: ReactNode }) {
  return <TableCell onClick={stopPropagation}>{children}</TableCell>;
}
