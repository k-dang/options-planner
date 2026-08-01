import { strategyTemplates } from "./strategy-templates";
import type { PositionLeg, StrategyState } from "./types";

type ExportStockLeg = {
  action: "buy" | "sell";
  quantity: number;
  unit: "share";
  instrument: "stock";
};

type ExportOptionLeg = {
  action: "buy" | "sell";
  quantity: number;
  unit: "contract";
  instrument: "call" | "put";
  strike: number;
  expiration: string;
};

type ExportLeg = ExportStockLeg | ExportOptionLeg;

export function formatStrategyExport(state: StrategyState) {
  const symbol = state.symbol.trim().toUpperCase();
  const strategy = strategyTemplates.get(state.strategy).label;
  const legs = state.legs.map(normalizeLeg);
  const markdownLegs = legs.map((leg) => renderMarkdownLeg(leg, symbol));

  return {
    markdown: [`# ${symbol} ${strategy}`, "", ...markdownLegs].join("\n"),
    json: JSON.stringify({ symbol, strategy, legs }, null, 2),
  };
}

function normalizeLeg(leg: PositionLeg): ExportLeg {
  if (leg.kind === "stock") {
    return {
      action: actionFor(leg),
      quantity: leg.quantity,
      unit: "share",
      instrument: "stock",
    };
  }

  return {
    action: actionFor(leg),
    quantity: leg.quantity,
    unit: "contract",
    instrument: leg.optionType,
    strike: leg.strike,
    expiration: leg.expiration,
  };
}

function renderMarkdownLeg(leg: ExportLeg, symbol: string) {
  if (leg.instrument === "stock") {
    return `- ${capitalize(leg.action)} ${leg.quantity} ${symbol} ${pluralize(leg.unit, leg.quantity)}`;
  }

  return `- ${capitalize(leg.action)} ${leg.quantity} ${symbol} $${formatStrike(leg.strike)} ${leg.instrument} ${pluralize(leg.unit, leg.quantity)} expiring ${leg.expiration}`;
}

function actionFor(leg: PositionLeg): "buy" | "sell" {
  return leg.side === "long" ? "buy" : "sell";
}

function capitalize(value: "buy" | "sell") {
  return value === "buy" ? "Buy" : "Sell";
}

function pluralize(unit: "share" | "contract", quantity: number) {
  return quantity === 1 ? unit : `${unit}s`;
}

function formatStrike(strike: number) {
  return String(strike);
}
