import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateRaw = url.searchParams.get('state');
    if (!code || !stateRaw) return html('Parâmetros inválidos.', 400);

    let state: { user_id: string; company_id: string; return_to?: string };
    try { state = JSON.parse(atob(stateRaw)); } catch { return html('State inválido.', 400); }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) return html('Google OAuth não configurado.', 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const redirectUri = `${supabaseUrl}/functions/v1/tickets-google-oauth-callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok) return html(`Falha no Google: ${tok.error_description || tok.error}`, 400);

    let email: string | null = null;
    try {
      const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      if (ui.ok) email = (await ui.json()).email ?? null;
    } catch { /* ignore */ }

    const expires_at = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const patch: Record<string, unknown> = {
      company_id: state.company_id,
      user_id: state.user_id,
      google_access_token: tok.access_token,
      google_token_expires_at: expires_at,
      google_calendar_id: 'primary',
      sync_enabled: true,
      scope: tok.scope ?? null,
      google_email: email,
    };
    if (tok.refresh_token) patch.google_refresh_token = tok.refresh_token;

    const { data: existing } = await admin
      .from('ticket_calendar_integrations').select('id, google_refresh_token')
      .eq('user_id', state.user_id).maybeSingle();

    if (existing) {
      if (!patch.google_refresh_token && existing.google_refresh_token) {
        patch.google_refresh_token = existing.google_refresh_token;
      }
      await admin.from('ticket_calendar_integrations').update(patch).eq('id', existing.id);
    } else {
      await admin.from('ticket_calendar_integrations').insert(patch);
    }

    const target = state.return_to || '/app/tickets/configuracoes';
    return new Response(
      `<html><body style="font-family:system-ui;padding:32px;text-align:center">
        <h2>✅ Google Calendar conectado</h2>
        <p>Você pode fechar esta aba.</p>
        <script>setTimeout(()=>{ try{ window.opener && window.opener.postMessage({type:'google-calendar-connected'},'*'); window.close(); }catch(e){} location.href=${JSON.stringify(target)}; }, 800);</script>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  } catch (e) {
    return html(`Erro: ${e}`, 500);
  }
});

function html(msg: string, status: number) {
  return new Response(`<html><body style="font-family:system-ui;padding:32px"><h3>${msg}</h3></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}