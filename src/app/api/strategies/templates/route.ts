import { NextResponse } from "next/server";
import { getV1StrategyTemplates } from "@/modules/strategies/catalog";

export async function GET() {
  const data = getV1StrategyTemplates();
  return NextResponse.json({ data });
}
