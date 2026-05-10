import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const URL_BASE = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("wa-bulk-monitor responde 200 com stats e timestamp", async () => {
  const res = await fetch(`${URL_BASE}/functions/v1/wa-bulk-monitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ tick: "test" }),
  });
  const json = await res.json();
  assertEquals(res.status, 200);
  assert(json.stats, "stats ausente");
  assert(typeof json.stats.verificadas === "number");
  assert(typeof json.ts === "string");
});