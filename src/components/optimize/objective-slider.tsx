import type { OptimizerObjective } from "@/modules/optimizer/schemas";

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
        {/* Tick marks */}
        <div className="pointer-events-none absolute inset-x-0 flex items-center justify-between px-[7px]">
          {Array.from({ length: 3 }, (_, tick) => tick).map((tick) => (
            <div key={tick} className="h-2 w-px bg-white/[0.18]" />
          ))}
        </div>
        <input
          type="range"
          min="0"
          max="8"
          step="4"
          value={OBJECTIVE_TO_NUM[value]}
          onChange={(e) => {
            onChange(NUM_TO_OBJECTIVE[Number(e.target.value)]);
          }}
          className="objective-slider"
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
