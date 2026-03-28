import { NextResponse } from "next/server";
import { getV1StrategyTemplates } from "@/domain/strategy-catalog";

export async function GET() {
  const data = getV1StrategyTemplates();
  return NextResponse.json({ data });
}
