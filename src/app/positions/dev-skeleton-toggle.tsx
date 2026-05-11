"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DevSkeletonToggle({
  skeleton,
  children,
}: {
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  const [forceSkeleton, setForceSkeleton] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant={forceSkeleton ? "default" : "outline"}
          aria-pressed={forceSkeleton}
          onClick={() => setForceSkeleton((value) => !value)}
        >
          {forceSkeleton ? "Exit skeleton" : "Show skeleton"}
        </Button>
      </div>
      {forceSkeleton ? skeleton : children}
    </>
  );
}
