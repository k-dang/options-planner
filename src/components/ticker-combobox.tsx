"use client";

import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { TickerSuggestion } from "@/lib/tickers";

export function TickerCombobox({
  defaultSymbol,
  inputName,
  onNavigate,
  resetOnBlur = true,
}: {
  defaultSymbol: string;
  inputName?: string;
  onNavigate?: (symbol: string) => void;
  resetOnBlur?: boolean;
}) {
  const [committedSymbol, setCommittedSymbol] = useState(defaultSymbol);
  const [symbolDraft, setSymbolDraft] = useState(defaultSymbol);
  const [tickerSuggestions, setTickerSuggestions] = useState<
    TickerSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/tickers/search?q=${encodeURIComponent(symbolDraft)}`,
        );
        if (res.ok) {
          setTickerSuggestions((await res.json()) as TickerSuggestion[]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [symbolDraft]);

  function commit(symbol: string) {
    setCommittedSymbol(symbol);
    setSymbolDraft(symbol);
    onNavigate?.(symbol);
  }

  function handleSelect(suggestion: TickerSuggestion | null) {
    if (!suggestion) return;
    commit(suggestion.symbol);
  }

  function handleBlur() {
    if (!resetOnBlur) {
      return;
    }
    setSymbolDraft(committedSymbol);
  }

  return (
    <Combobox<TickerSuggestion>
      autoHighlight
      inputValue={symbolDraft}
      isItemEqualToValue={(item, value) => item?.symbol === value?.symbol}
      itemToStringLabel={(item) => item?.symbol ?? ""}
      items={tickerSuggestions}
      onInputValueChange={(value, eventDetails) => {
        if (eventDetails.reason !== "input-change") {
          return;
        }
        setSymbolDraft(value.toUpperCase());
      }}
      onValueChange={handleSelect}
    >
      <ComboboxInput
        aria-label="Symbol"
        name={inputName}
        showTrigger={false}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            tickerSuggestions.every(
              (suggestion) => suggestion.symbol !== symbolDraft,
            )
          ) {
            const symbol = symbolDraft.trim().toUpperCase();
            if (symbol) commit(symbol);
          }
        }}
      >
        <ComboboxContent className="min-w-72 rounded-xl">
          <ComboboxEmpty>
            {isLoading ? "Searching..." : "No matching tickers"}
          </ComboboxEmpty>
          <ComboboxList>
            {tickerSuggestions.map((suggestion, index) => (
              <ComboboxItem
                index={index}
                key={suggestion.symbol}
                value={suggestion}
              >
                <span className="font-mono font-bold">{suggestion.symbol}</span>
                <span className="truncate text-muted-foreground">
                  {suggestion.name}
                </span>
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </ComboboxInput>
    </Combobox>
  );
}
