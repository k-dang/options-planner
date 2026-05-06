import type { NextRequest } from "next/server";
import { searchAlpacaTickers, searchTickerSuggestions } from "@/lib/tickers";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const results = await searchAlpacaTickers(query);
    if (results.length > 0) {
      return Response.json(results);
    }
  } catch (err) {
    console.error("Alpaca ticker search failed:", err);
  }

  return Response.json(searchTickerSuggestions(query));
}
