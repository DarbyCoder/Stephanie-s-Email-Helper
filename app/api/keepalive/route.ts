import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

// Called once a day by Vercel Cron (vercel.json). Supabase pauses free-plan
// projects after about a week without activity; one tiny query keeps it awake.
export async function GET(request: Request) {
  await connection(); // run at request time, never prerendered

  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { error } = await createPublicClient().from("events").select("id").limit(1);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
