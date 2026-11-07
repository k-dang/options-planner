import { revalidatePath } from "next/cache";
import { refreshOpenSavedStrategies } from "@/db/saved-strategies";

// Called by the Vercel Schedule in vercel.json, which sends CRON_SECRET as a
// bearer token. A partial failure returns 500 so it shows in the schedule's run
// history; the next run retries because each refresh is independent.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const results = await refreshOpenSavedStrategies();
  revalidatePath("/positions");

  const failures = results.filter((result) => !result.ok);
  for (const failure of failures) {
    console.error(`Position ${failure.id} refresh failed: ${failure.message}`);
  }

  return Response.json(
    { refreshed: results.length - failures.length, failed: failures.length },
    { status: failures.length > 0 ? 500 : 200 },
  );
}
