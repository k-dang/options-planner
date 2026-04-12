import { useReducer, useRef } from "react";
import {
  getDefaultStrikeForExpiry,
  parsePositiveIntegerInput,
  parsePositiveNumberInput,
} from "@/components/builder/builder-helpers";
import type { OptionIndex } from "@/modules/market/schemas";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

type BuilderDraftState = BuilderStateInput | null;

type BuilderDraftAction =
  | {
      type: "update-horizon-days";
      value: number;
    }
  | {
      type: "update-leg-quantity";
      index: number;
      value: number;
    }
  | {
      type: "update-option-leg-expiry";
      index: number;
      expiry: string;
      optionIndex: OptionIndex | null;
    }
  | {
      type: "update-option-leg-strike";
      index: number;
      strike: number;
    };

export function getNextBuilderDraftState(
  state: BuilderDraftState,
  action: BuilderDraftAction,
): BuilderDraftState {
  if (!state) {
    return null;
  }

  switch (action.type) {
    case "update-horizon-days":
      if (state.horizonDays === action.value) {
        return state;
      }

      return {
        ...state,
        horizonDays: action.value,
      };

    case "update-leg-quantity": {
      const leg = state.legs[action.index];
      if (!leg || leg.qty === action.value) {
        return state;
      }

      return {
        ...state,
        legs: state.legs.map((leg, index) =>
          index === action.index
            ? {
                ...leg,
                qty: action.value,
              }
            : leg,
        ),
      };
    }

    case "update-option-leg-expiry": {
      const leg = state.legs[action.index];
      if (!leg || leg.kind !== "option") {
        return state;
      }

      const nextStrike = getDefaultStrikeForExpiry({
        optionIndex: action.optionIndex,
        expiry: action.expiry,
        right: leg.right,
        currentStrike: leg.strike,
      });

      return {
        ...state,
        legs: state.legs.map((existingLeg, index) =>
          index === action.index && existingLeg.kind === "option"
            ? {
                ...existingLeg,
                expiry: action.expiry,
                strike: nextStrike ?? existingLeg.strike,
              }
            : existingLeg,
        ),
      };
    }

    case "update-option-leg-strike": {
      const leg = state.legs[action.index];
      if (!leg || leg.kind !== "option" || leg.strike === action.strike) {
        return state;
      }

      return {
        ...state,
        legs: state.legs.map((leg, index) =>
          index === action.index && leg.kind === "option"
            ? {
                ...leg,
                strike: action.strike,
              }
            : leg,
        ),
      };
    }
  }
}

export function useBuilderDraft(initialState: BuilderStateInput | null) {
  const [draft, dispatch] = useReducer(getNextBuilderDraftState, initialState);
  const latestDraftRef = useRef(draft);
  latestDraftRef.current = draft;

  function applyDraftAction(action: BuilderDraftAction) {
    const nextState = getNextBuilderDraftState(latestDraftRef.current, action);
    latestDraftRef.current = nextState;
    dispatch(action);
    return nextState;
  }

  function updateHorizonDays(value: string) {
    const nextValue = parsePositiveIntegerInput(value);
    if (nextValue === null) {
      return null;
    }

    return applyDraftAction({
      type: "update-horizon-days",
      value: nextValue,
    });
  }

  function updateLegQuantity(index: number, value: string) {
    const nextValue = parsePositiveNumberInput(value);
    if (nextValue === null) {
      return null;
    }

    return applyDraftAction({
      type: "update-leg-quantity",
      index,
      value: nextValue,
    });
  }

  function updateOptionLegExpiry(
    index: number,
    expiry: string,
    optionIndex: OptionIndex | null,
  ) {
    const leg = latestDraftRef.current?.legs[index];
    if (!leg || leg.kind !== "option") {
      return null;
    }

    return applyDraftAction({
      type: "update-option-leg-expiry",
      index,
      expiry,
      optionIndex,
    });
  }

  function updateOptionLegStrike(index: number, strike: number) {
    if (!Number.isFinite(strike) || strike <= 0) {
      return null;
    }

    const leg = latestDraftRef.current?.legs[index];
    if (!leg || leg.kind !== "option") {
      return null;
    }

    return applyDraftAction({
      type: "update-option-leg-strike",
      index,
      strike,
    });
  }

  return {
    horizonDays: draft?.horizonDays ?? null,
    legs: draft?.legs ?? [],
    updateHorizonDays,
    updateLegQuantity,
    updateOptionLegExpiry,
    updateOptionLegStrike,
  };
}
