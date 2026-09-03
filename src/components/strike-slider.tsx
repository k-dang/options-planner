"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";
import { formatCurrency } from "@/lib/format";
import type { OptionExpiration, OptionLeg } from "@/lib/options";
import { cn } from "@/lib/utils";

type StrikeSliderProps = {
  legs: OptionLeg[];
  expiration: OptionExpiration | undefined;
  underlyingPrice: number;
  symbol: string;
  onLegStrikeChange: (index: number, strike: number) => void;
};

const PILL_GAP_PCT = 7;
const TRACK_TOP = 96;
const PILL_HEIGHT = 22;
const PILL_ROW_NEAR = 52;
const PILL_ROW_FAR = 26;

export function StrikeSlider({
  legs,
  expiration,
  underlyingPrice,
  symbol,
  onLegStrikeChange,
}: StrikeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const callStrikes = uniqueSorted(
    expiration?.calls.map((c) => c.strike) ?? [],
  );
  const putStrikes = uniqueSorted(expiration?.puts.map((p) => p.strike) ?? []);
  const allStrikes = uniqueSorted([...callStrikes, ...putStrikes]);

  const { min, max } = computeDomain(allStrikes, underlyingPrice);

  const priceToPct = (price: number) => ((price - min) / (max - min)) * 100;

  const tickInterval = niceTickInterval(max - min);
  const majorTicks = computeMajorTicks(min, max, tickInterval);

  const pillRowByIndex = assignPillRows(
    legs.map((leg, index) => ({
      index,
      x: ((leg.strike - min) / (max - min)) * 100,
    })),
  );

  function snapPriceForLeg(leg: OptionLeg, targetPrice: number): number {
    const list = leg.optionType === "call" ? callStrikes : putStrikes;
    if (list.length === 0) return leg.strike;
    return list.reduce((best, candidate) =>
      Math.abs(candidate - targetPrice) < Math.abs(best - targetPrice)
        ? candidate
        : best,
    );
  }

  function commitFromClientX(index: number, clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = clamp01((clientX - rect.left) / rect.width);
    const price = min + ratio * (max - min);
    const snapped = snapPriceForLeg(legs[index], price);
    if (snapped !== legs[index].strike) onLegStrikeChange(index, snapped);
  }

  function handlePointerDown(index: number) {
    return (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setActiveIndex(index);
      commitFromClientX(index, event.clientX);
    };
  }

  function handlePointerMove(index: number) {
    return (event: PointerEvent<HTMLButtonElement>) => {
      if (activeIndex !== index) return;
      commitFromClientX(index, event.clientX);
    };
  }

  function handlePointerUp() {
    return (event: PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setActiveIndex(null);
    };
  }

  function handleKeyDown(index: number) {
    return (event: KeyboardEvent<HTMLButtonElement>) => {
      const leg = legs[index];
      const list = leg.optionType === "call" ? callStrikes : putStrikes;
      if (list.length === 0) return;
      const cur = list.indexOf(leg.strike);
      let nextIdx: number | null = null;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextIdx = Math.max(0, (cur < 0 ? 0 : cur) - 1);
      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextIdx = Math.min(list.length - 1, (cur < 0 ? 0 : cur) + 1);
      } else if (event.key === "Home") {
        nextIdx = 0;
      } else if (event.key === "End") {
        nextIdx = list.length - 1;
      }
      if (nextIdx !== null) {
        event.preventDefault();
        const nextStrike = list[nextIdx];
        if (nextStrike !== leg.strike) onLegStrikeChange(index, nextStrike);
      }
    };
  }

  if (!expiration || legs.length === 0) return null;

  const spotPct = priceToPct(underlyingPrice);
  const legStrikes = new Set(legs.map((leg) => leg.strike));

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 px-4 pb-3 pt-3 shadow-inner">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Strike axis
          <span className="ml-2 text-foreground/50">
            · drag to set · ←→ to nudge
          </span>
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {legs.length} leg{legs.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="relative h-[148px] select-none">
        {/* Spot vertical guideline — extends to the axis */}
        <div
          aria-hidden
          className="pointer-events-none absolute h-24 w-px bg-gradient-to-b from-foreground/0 via-foreground/40 to-foreground/60"
          style={{ left: `${spotPct}%`, top: 0 }}
        />

        {/* Spot label callout (top) */}
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${spotPct}%` }}
        >
          <div className="rounded-md border border-border bg-background/95 px-2 py-0.5 shadow-sm backdrop-blur">
            <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-foreground">
              {symbol.toUpperCase()}
            </span>
            <span className="ml-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
              {formatCurrency(underlyingPrice)}
            </span>
          </div>
          <svg
            className="-mt-px text-border"
            width={10}
            height={6}
            viewBox="0 0 10 6"
            fill="currentColor"
            role="presentation"
          >
            <title>Spot price indicator</title>
            <path d="M0 0 L10 0 L5 6 Z" />
          </svg>
        </div>

        {/* Leg pills with leader lines */}
        {legs.map((leg, index) => {
          const x = priceToPct(leg.strike);
          const row = pillRowByIndex.get(index) ?? 0;
          const isActive = activeIndex === index;
          const isLong = leg.side === "long";
          const top = row === 0 ? PILL_ROW_NEAR : PILL_ROW_FAR;
          const leaderHeight = TRACK_TOP - top - PILL_HEIGHT;
          const list = leg.optionType === "call" ? callStrikes : putStrikes;

          // Legs are identified by index everywhere else (activeIndex,
          // onLegStrikeChange). Quantity stays out of the key so editing it does
          // not remount every pill and drop pointer capture mid-drag.
          const pillKey = `${index}-${leg.optionType}-${leg.side}`;

          return (
            <div
              key={pillKey}
              className="absolute -translate-x-1/2"
              style={{ left: `${x}%`, top }}
            >
              <div
                aria-hidden
                className={cn(
                  "absolute left-1/2 top-full -translate-x-1/2",
                  isLong ? "bg-profit/50" : "bg-destructive/50",
                  isActive && (isLong ? "bg-profit" : "bg-destructive"),
                )}
                style={
                  {
                    height: `${leaderHeight}px`,
                    width: isActive ? 1.5 : 1,
                  } as CSSProperties
                }
              />
              <button
                type="button"
                role="slider"
                aria-label={`${legActionVerb(leg)} ${leg.quantity} ${leg.optionType} at strike ${leg.strike}. Drag or use arrow keys to change strike.`}
                aria-valuemin={list[0] ?? leg.strike}
                aria-valuemax={list[list.length - 1] ?? leg.strike}
                aria-valuenow={leg.strike}
                aria-valuetext={`${formatCurrency(leg.strike)} ${leg.optionType}`}
                onPointerDown={handlePointerDown(index)}
                onPointerMove={handlePointerMove(index)}
                onPointerUp={handlePointerUp()}
                onPointerCancel={handlePointerUp()}
                onKeyDown={handleKeyDown(index)}
                className={cn(
                  "relative flex h-[22px] cursor-grab touch-none items-center gap-0.5 rounded-full px-2.5 pl-3",
                  "font-mono text-[11px] font-bold tabular-nums shadow-md transition-all",
                  "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "hover:-translate-y-0.5 hover:shadow-lg",
                  isActive &&
                    "scale-[1.08] cursor-grabbing shadow-xl ring-2 ring-offset-2 ring-offset-background",
                  isLong
                    ? "bg-profit text-white ring-profit/70 focus-visible:ring-profit"
                    : "bg-destructive text-white ring-destructive/70 focus-visible:ring-destructive",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full",
                    isLong ? "bg-white/95" : "bg-white/95",
                  )}
                />
                <span className="ml-2 leading-none">
                  {formatStrikeLabel(leg.strike)}
                </span>
                <span className="text-[10px] leading-none opacity-95">
                  {leg.optionType === "call" ? "C" : "P"}
                </span>
              </button>
            </div>
          );
        })}

        {/* Axis track (the measurable element for drag math) */}
        <div
          ref={trackRef}
          className="absolute inset-x-0"
          style={{ top: TRACK_TOP }}
        >
          {/* Axis line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-border/20 via-border to-border/20" />

          {/* Minor ticks at every available strike (above the axis line) */}
          {allStrikes.map((strike) => {
            const x = priceToPct(strike);
            const isLegStrike = legStrikes.has(strike);
            return (
              <div
                key={`avail-${strike}`}
                aria-hidden
                className="absolute -translate-x-1/2"
                style={{ left: `${x}%`, top: -3 }}
              >
                <div
                  className={cn(
                    "rounded-full",
                    isLegStrike
                      ? "h-1.5 w-1.5 bg-foreground/80"
                      : "h-1 w-px bg-muted-foreground/40",
                  )}
                />
              </div>
            );
          })}

          {/* Spot vertical mark on the axis */}
          <div
            aria-hidden
            className="absolute -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${spotPct}%`, top: -4, width: 2, height: 9 }}
          />

          {/* Major ticks below axis with labels */}
          {majorTicks.map((value) => {
            const x = priceToPct(value);
            return (
              <div
                key={`major-${value}`}
                aria-hidden
                className="absolute flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${x}%`, top: 1 }}
              >
                <div className="h-1.5 w-px bg-muted-foreground/50" />
                <div className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground/80">
                  {formatTickLabel(value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function uniqueSorted(arr: number[]): number[] {
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function computeDomain(strikes: number[], spot: number) {
  if (strikes.length === 0) {
    const pad = Math.max(spot * 0.1, 5);
    return { min: spot - pad, max: spot + pad };
  }
  const lo = Math.min(strikes[0], spot);
  const hi = Math.max(strikes[strikes.length - 1], spot);
  const range = Math.max(hi - lo, 1);
  let leftPad = range * 0.06;
  let rightPad = range * 0.06;
  // Keep spot within the middle 70% so the marker is visible
  const spotPos = (spot - lo) / range;
  if (spotPos < 0.15) {
    leftPad = Math.max(leftPad, range * 0.15 - (spot - lo));
  }
  if (spotPos > 0.85) {
    rightPad = Math.max(rightPad, spot - lo - range * 0.85);
  }
  return { min: lo - leftPad, max: hi + rightPad };
}

function computeMajorTicks(min: number, max: number, tickInterval: number) {
  const ticks: number[] = [];
  const start = Math.ceil(min / tickInterval) * tickInterval;
  for (let v = start; v <= max + 1e-6; v += tickInterval) {
    ticks.push(Number(v.toFixed(4)));
  }
  return ticks;
}

function niceTickInterval(range: number) {
  const target = Math.max(range, 1) / 7;
  const mag = 10 ** Math.floor(Math.log10(target));
  const norm = target / mag;
  let nice: number;
  if (norm < 1.5) nice = 1;
  else if (norm < 3) nice = 2;
  else if (norm < 7) nice = 5;
  else nice = 10;
  return nice * mag;
}

function formatTickLabel(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value >= 10 ? 1 : 2);
}

function formatStrikeLabel(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value >= 100 ? 0 : 1);
}

function assignPillRows(
  pills: { index: number; x: number }[],
): Map<number, number> {
  const rows = new Map<number, number>();
  const sorted = pills.toSorted((a, b) => a.x - b.x);
  let row0X = -Infinity;
  let row1X = -Infinity;
  for (const pill of sorted) {
    if (pill.x - row0X >= PILL_GAP_PCT) {
      rows.set(pill.index, 0);
      row0X = pill.x;
    } else if (pill.x - row1X >= PILL_GAP_PCT) {
      rows.set(pill.index, 1);
      row1X = pill.x;
    } else if (row0X <= row1X) {
      rows.set(pill.index, 0);
      row0X = pill.x;
    } else {
      rows.set(pill.index, 1);
      row1X = pill.x;
    }
  }
  return rows;
}

function legActionVerb(leg: OptionLeg) {
  return leg.side === "long" ? "Buy" : "Sell";
}
