import type { OptimizerObjective } from "@/modules/optimizer/schemas";

import { Slider } from "@/components/ui/slider";

type ObjectiveSliderProps = {
  value: OptimizerObjective;
  onChange: (value: OptimizerObjective) => void;
};

const OBJECTIVE_TO_NUM: Record<OptimizerObjective, number> = {
  expectedProfit: 0,
  balanced: 4,
  chanceOfProfit: 8,
};

const NUM_TO_OBJECTIVE: Record<number, OptimizerObjective> = {
  0: "expectedProfit",
  4: "balanced",
  8: "chanceOfProfit",
};

export function ObjectiveSlider({ value, onChange }: ObjectiveSliderProps) {
  return (
    <div className="w-full space-y-2.5">
      <div className="relative flex items-center py-3">
        <div className="pointer-events-none absolute inset-x-0 flex items-center justify-between px-[7px]">
          {Array.from({ length: 3 }, (_, tick) => tick).map((tick) => (
            <div key={tick} className="h-2 w-px bg-white/[0.18]" />
          ))}
        </div>
        <Slider
          min={0}
          max={8}
          step={4}
          value={[OBJECTIVE_TO_NUM[value]]}
          onValueChange={([nextValue]) => {
            const nextObjective = NUM_TO_OBJECTIVE[nextValue];

            if (nextObjective) {
              onChange(nextObjective);
            }
          }}
          className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:size-auto [&_[data-slot=slider-thumb]]:h-[26px] [&_[data-slot=slider-thumb]]:w-[14px] [&_[data-slot=slider-thumb]]:rounded-[3px] [&_[data-slot=slider-thumb]]:border-white/[0.18] [&_[data-slot=slider-thumb]]:bg-[oklch(0.38_0.01_260)] [&_[data-slot=slider-thumb]]:shadow-[0_2px_8px_oklch(0_0_0_/_0.5),inset_0_1px_0_oklch(1_0_0_/_0.08)] [&_[data-slot=slider-thumb]]:transition-[background,box-shadow] [&_[data-slot=slider-thumb]]:hover:bg-[oklch(0.44_0.01_260)] [&_[data-slot=slider-thumb]]:hover:shadow-[0_2px_12px_oklch(0_0_0_/_0.5),inset_0_1px_0_oklch(1_0_0_/_0.1)] [&_[data-slot=slider-track]]:h-px [&_[data-slot=slider-track]]:bg-white/[0.1]"
          aria-label="Optimizer objective"
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[0.6rem] uppercase tracking-wider">
        <span className="text-primary">← Max Return</span>
        <span className="text-gold">Max Chance →</span>
      </div>
    </div>
  );
}
