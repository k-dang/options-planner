import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"output">) {
  return (
    <output
      aria-label="Loading"
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </output>
  );
}

export { Spinner };
