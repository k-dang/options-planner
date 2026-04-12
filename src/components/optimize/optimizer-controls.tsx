import { useEffect, useState } from "react";
import { ExpirationPicker } from "@/components/optimize/expiration-picker";
import { ObjectiveSlider } from "@/components/optimize/objective-slider";
import { SentimentSelector } from "@/components/optimize/sentiment-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OptimizerSentimentKey } from "@/lib/optimizer-sentiments";
import type { OptimizerObjective } from "@/modules/optimizer/schemas";

export type OptimizerControlsProps = {
  quotePrice: number;
  sentiment: OptimizerSentimentKey | null;
  onSentimentChange: (key: OptimizerSentimentKey, targetPrice: number) => void;
  targetPrice: number;
  onTargetPriceChange: (price: number) => void;
  budget: number | null;
  onBudgetChange: (budget: number | null) => void;
  expirations: string[];
  selectedExpiration: string | null;
  onExpirationChange: (date: string) => void;
  objective: OptimizerObjective;
  onObjectiveChange: (value: OptimizerObjective) => void;
};

export function OptimizerControls({
  quotePrice,
  sentiment,
  onSentimentChange,
  targetPrice,
  onTargetPriceChange,
  budget,
  onBudgetChange,
  expirations,
  selectedExpiration,
  onExpirationChange,
  objective,
  onObjectiveChange,
}: OptimizerControlsProps) {
  const [targetPriceInput, setTargetPriceInput] = useState(
    targetPrice.toFixed(2),
  );
  const [budgetInput, setBudgetInput] = useState(
    budget == null ? "" : `${budget}`,
  );

  useEffect(() => {
    setTargetPriceInput(targetPrice.toFixed(2));
  }, [targetPrice]);

  useEffect(() => {
    setBudgetInput(budget == null ? "" : `${budget}`);
  }, [budget]);

  const hasQuotePrice = Boolean(quotePrice);
  const pctChange = hasQuotePrice
    ? ((targetPrice - quotePrice) / quotePrice) * 100
    : null;
  const pctLabel =
    pctChange == null
      ? "N/A"
      : pctChange >= 0
        ? `+${pctChange.toFixed(0)}%`
        : `${pctChange.toFixed(0)}%`;

  return (
    <div className="animate-fade-up mb-10 flex w-full flex-col items-center gap-6">
      <SentimentSelector
        quotePrice={quotePrice}
        sentiment={sentiment}
        onSentimentChange={onSentimentChange}
      />

      {/* Target Price + Budget row */}
      <div className="flex w-full items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="target-price"
            className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground/60"
          >
            Target Price: $
          </Label>
          <Input
            id="target-price"
            type="number"
            hideNumberSpinner
            value={targetPriceInput}
            onChange={(e) => {
              setTargetPriceInput(e.target.value);
            }}
            onBlur={(e) => {
              const val = Number.parseFloat(e.target.value);
              if (!Number.isNaN(val) && val > 0) {
                onTargetPriceChange(val);
                return;
              }

              setTargetPriceInput(targetPrice.toFixed(2));
            }}
            className="w-24 border-white/[0.08] bg-[oklch(0.12_0.008_260)] px-2.5 py-1.5 font-mono focus-visible:border-primary/30 focus-visible:ring-0"
          />
          <span
            className={`font-mono text-[0.65rem] font-medium ${pctChange == null ? "text-muted-foreground" : pctChange >= 0 ? "text-profit" : "text-loss"}`}
          >
            ({pctLabel})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Label
            htmlFor="budget"
            className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground/60"
          >
            Budget: $
          </Label>
          <Input
            id="budget"
            type="text"
            inputMode="decimal"
            value={budgetInput}
            placeholder="None"
            onChange={(e) => {
              setBudgetInput(e.target.value);
            }}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                onBudgetChange(null);
                return;
              }

              const val = Number.parseFloat(raw);
              if (!Number.isNaN(val) && val > 0) {
                onBudgetChange(val);
                return;
              }

              setBudgetInput(budget == null ? "" : `${budget}`);
            }}
            className="w-24 border-white/[0.08] bg-[oklch(0.12_0.008_260)] px-2.5 py-1.5 font-mono placeholder:text-muted-foreground/30 focus-visible:border-primary/30 focus-visible:ring-0"
          />
        </div>
      </div>

      {expirations.length > 0 ? (
        <ExpirationPicker
          expirations={expirations}
          value={selectedExpiration}
          onChange={onExpirationChange}
        />
      ) : null}

      <ObjectiveSlider value={objective} onChange={onObjectiveChange} />
    </div>
  );
}
