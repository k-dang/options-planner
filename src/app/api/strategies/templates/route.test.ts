import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  strategyTemplateSchema,
  V1_APPROVED_STRATEGY_NAMES,
} from "@/domain/strategy-catalog";
import { GET } from "./route";

const responseSchema = z.object({
  data: z.array(strategyTemplateSchema),
});

describe("GET /api/strategies/templates", () => {
  it("returns all v1 templates", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = responseSchema.parse(await res.json());
    expect(body.data).toHaveLength(V1_APPROVED_STRATEGY_NAMES.length);
    expect([...body.data.map((t) => t.name)].sort()).toEqual(
      [...V1_APPROVED_STRATEGY_NAMES].sort(),
    );
  });
});
