import { ExpirationPicker } from "@/components/optimize/expiration-picker";
import { ObjectiveSlider } from "@/components/optimize/objective-slider";
import { SentimentSelector } from "@/components/optimize/sentiment-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OptimizerObjective } from "@/modules/optimizer/schemas";

export type OptimizerControlsProps = {
  quotePrice: number;
  sentiment: string | null;
  onSentimentChange: (key: string, targetPrice: number) => void;
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
            value={targetPrice.toFixed(2)}
            onChange={(e) => {
              const val = Number.parseFloat(e.target.value);
              if (!Number.isNaN(val) && val > 0) {
                onTargetPriceChange(val);
              }
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
            value={budget == null ? "" : budget}
            placeholder="None"
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                onBudgetChange(null);
                return;
              }
              const val = Number.parseFloat(raw);
              if (!Number.isNaN(val) && val > 0) {
                onBudgetChange(val);
              }
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
