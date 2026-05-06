const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

type Action = 'upsert' | 'delete';
interface Body {
  action: Action;
  event_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const body = (await req.json()) as Body;
    if (!body?.event_id || !body.action) return json({ error: 'Invalid body' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: integ } = await admin
      .from('ticket_calendar_integrations').select('*').eq('user_id', userId).maybeSingle();
    if (!integ?.sync_enabled) return json({ skipped: 'sync_disabled' });

    const accessToken = await ensureToken(admin, integ);
    if (!accessToken) return json({ error: 'No valid Google token' }, 400);
    const calId = integ.google_calendar_id || 'primary';

    const { data: ev } = await admin
      .from('ticket_events').select('*').eq('id', body.event_id).maybeSingle();
    if (!ev) return json({ error: 'event not found' }, 404);

    if (body.action === 'delete') {
      if (ev.google_event_id) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${ev.google_event_id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      }
      return json({ ok: true });
    }

    // upsert
    let ticketTitle = '';
    if (ev.ticket_id) {
      const { data: t } = await admin.from('tickets').select('ticket_number,title').eq('id', ev.ticket_id).maybeSingle();
      if (t) ticketTitle = ` (#${t.ticket_number} ${t.title})`;
    }
    const eventBody = {
      summary: ev.title + ticketTitle,
      description: ev.description ?? '',
      start: { dateTime: ev.start_datetime },
      end: { dateTime: ev.end_datetime },
      status: ev.status === 'cancelled' ? 'cancelled' : 'confirmed',
    };

    let resp: Response;
    if (ev.google_event_id) {
      resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${ev.google_event_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
      });
    } else {
      resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
      });
    }
    const out = await resp.json();
    if (!resp.ok) return json({ error: out.error?.message || 'google_error', details: out }, 502);

    if (out.id && out.id !== ev.google_event_id) {
      await admin.from('ticket_events').update({ google_event_id: out.id }).eq('id', ev.id);
    }
    return json({ ok: true, google_event_id: out.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function ensureToken(admin: SupabaseClient, integ: any): Promise<string | null> {
  const exp = integ.google_token_expires_at ? new Date(integ.google_token_expires_at).getTime() : 0;
  if (integ.google_access_token && exp - Date.now() > 60_000) return integ.google_access_token;
  if (!integ.google_refresh_token) return integ.google_access_token ?? null;

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      grant_type: 'refresh_token', refresh_token: integ.google_refresh_token,
    }),
  });
  const tok = await r.json();
  if (!r.ok) return null;
  const expires_at = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  await admin.from('ticket_calendar_integrations').update({
    google_access_token: tok.access_token, google_token_expires_at: expires_at,
  }).eq('id', integ.id);
  return tok.access_token;
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}