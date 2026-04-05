import { Button } from "@/components/ui/button";

type MonthGroup = {
  key: string;
  label: string;
  dates: { iso: string; day: number }[];
};

function groupByMonth(dates: string[]): MonthGroup[] {
  const groups: Map<string, MonthGroup> = new Map();
  for (const iso of dates) {
    const d = new Date(`${iso}T12:00:00`);
    const key = iso.slice(0, 7);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        dates: [],
      };
      groups.set(key, group);
    }
    group.dates.push({ iso, day: d.getDate() });
  }
  return Array.from(groups.values());
}

type ExpirationPickerProps = {
  expirations: string[];
  value: string | null;
  onChange: (date: string) => void;
};

export function ExpirationPicker({
  expirations,
  value,
  onChange,
}: ExpirationPickerProps) {
  const groups = groupByMonth(expirations);

  return (
    <div className="scrollbar-hide w-full overflow-x-auto py-2">
      <div className="flex w-full items-start justify-between px-1">
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col items-center gap-1.5">
            <span className="font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground/50">
              {group.label}
            </span>
            <div className="flex gap-0.5">
              {group.dates.map((d) => {
                const isSelected = value === d.iso;
                return (
                  <Button
                    key={d.iso}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onChange(d.iso)}
                    className={`h-8 w-8 rounded-full font-mono text-[0.65rem] sm:h-9 sm:w-9 ${
                      isSelected
                        ? "bg-primary/20 text-primary ring-1 ring-primary/40 hover:bg-primary/20 hover:text-primary"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {d.day}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
