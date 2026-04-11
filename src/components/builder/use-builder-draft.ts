import { useState } from "react";
import {
  getDefaultStrikeForExpiry,
  parsePositiveIntegerInput,
  parsePositiveNumberInput,
} from "@/components/builder/builder-helpers";
import type { OptionIndex } from "@/modules/market/schemas";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

export function useBuilderDraft(initialState: BuilderStateInput | null) {
  const [horizonDays, setHorizonDays] = useState(
    initialState?.horizonDays ?? null,
  );
  const [legs, setLegs] = useState<BuilderStateInput["legs"]>(
    initialState?.legs ?? [],
  );

  function updateHorizonDays(value: string) {
    const nextValue = parsePositiveIntegerInput(value);
    if (nextValue === null) {
      return;
    }

    setHorizonDays(nextValue);
  }

  function updateLegQuantity(index: number, value: string) {
    const nextValue = parsePositiveNumberInput(value);
    if (nextValue === null) {
      return;
    }

    setLegs((current) =>
      current.map((leg, legIndex) =>
        legIndex === index
          ? {
              ...leg,
              qty: nextValue,
            }
          : leg,
      ),
    );
  }

  function updateOptionLegExpiry(
    index: number,
    expiry: string,
    optionIndex: OptionIndex | null,
  ) {
    setLegs((current) => {
      const leg = current[index];
      if (!leg || leg.kind !== "option") {
        return current;
      }

      const nextStrike = getDefaultStrikeForExpiry({
        optionIndex,
        expiry,
        right: leg.right,
        currentStrike: leg.strike,
      });

      return current.map((existingLeg, legIndex) =>
        legIndex === index && existingLeg.kind === "option"
          ? {
              ...existingLeg,
              expiry,
              strike: nextStrike ?? existingLeg.strike,
            }
          : existingLeg,
      );
    });
  }

  function updateOptionLegStrike(index: number, strike: number) {
    if (!Number.isFinite(strike) || strike <= 0) {
      return;
    }

    setLegs((current) =>
      current.map((leg, legIndex) =>
        legIndex === index && leg.kind === "option"
          ? {
              ...leg,
              strike,
            }
          : leg,
      ),
    );
  }

  return {
    horizonDays,
    legs,
    updateHorizonDays,
    updateLegQuantity,
    updateOptionLegExpiry,
    updateOptionLegStrike,
  };
}
