import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const URL_BASE = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("wa-bulk-worker responde 200 e retorna stats", async () => {
  const res = await fetch(`${URL_BASE}/functions/v1/wa-bulk-worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ tick: "test" }),
  });
  const json = await res.json();
  assertEquals(res.status, 200);
  assert(json.stats, "stats ausente na resposta");
  assert(typeof json.stats.processados === "number");
});

Deno.test("wa-bulk-worker aceita CORS preflight", async () => {
  const res = await fetch(`${URL_BASE}/functions/v1/wa-bulk-worker`, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200);
});