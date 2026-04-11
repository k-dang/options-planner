"use client";

import { useEffect, useState } from "react";
import {
  type SymbolSearchResult,
  symbolSearchResponseSchema,
} from "@/modules/market/schemas";

type SymbolSearchState = {
  isFetching: boolean;
  results: SymbolSearchResult[];
};

const EMPTY_SYMBOL_SEARCH_STATE: SymbolSearchState = {
  isFetching: false,
  results: [],
};

export function useSymbolSearch(symbol: string, searchEnabled: boolean) {
  const [state, setState] = useState<SymbolSearchState>(
    EMPTY_SYMBOL_SEARCH_STATE,
  );

  useEffect(() => {
    if (!searchEnabled || symbol.length === 0) {
      setState(EMPTY_SYMBOL_SEARCH_STATE);
      return;
    }

    const controller = new AbortController();

    setState((current) => ({
      ...current,
      isFetching: true,
    }));

    const run = async () => {
      try {
        const response = await fetch(
          `/api/market/symbols?q=${encodeURIComponent(symbol)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setState(EMPTY_SYMBOL_SEARCH_STATE);
          return;
        }

        const parsed = symbolSearchResponseSchema.safeParse(
          await response.json(),
        );
        if (!parsed.success) {
          setState(EMPTY_SYMBOL_SEARCH_STATE);
          return;
        }

        setState({
          isFetching: false,
          results: parsed.data.data.slice(0, 6),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setState(EMPTY_SYMBOL_SEARCH_STATE);
      }
    };

    run().catch(() => {
      setState(EMPTY_SYMBOL_SEARCH_STATE);
    });

    return () => {
      controller.abort();
    };
  }, [searchEnabled, symbol]);

  return state;
}
