import type { z } from "zod";
import { apiErrorBodySchema } from "@/lib/api-response";

type ParsedJsonResult<TSchema extends z.ZodType> =
  | {
      ok: true;
      data: z.infer<TSchema>;
    }
  | {
      ok: false;
      error: "malformed-json";
    }
  | {
      ok: false;
      error: "invalid-data";
      issues: z.ZodIssue[];
    };

export async function parseJsonResponse<TSchema extends z.ZodType>(
  response: Response,
  schema: TSchema,
): Promise<ParsedJsonResult<TSchema>> {
  let json: unknown;

  try {
    json = await response.json();
  } catch {
    return {
      ok: false,
      error: "malformed-json",
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid-data",
      issues: parsed.error.issues,
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}

export async function getErrorMessage(response: Response) {
  const parsed = await parseJsonResponse(response, apiErrorBodySchema);

  if (!parsed.ok) {
    return null;
  }

  return parsed.data.error.message;
}
