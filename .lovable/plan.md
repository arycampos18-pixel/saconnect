## Plano de Segurança — Sessão SA Connect

Vou implementar 3 frentes de segurança: **logout por inatividade (5 min)**, **contador no header**, e **sessão única por utilizador** com alertas. Antes de codificar, preciso confirmar algumas decisões de produto.

### Frente 1 — Inatividade (5 min) + Contador no Header

- Hook `useIdleSession` montado no `AppLayout` (só área `/app`).
- Eventos: `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart` (passivos, debounced a 1s).
- Constantes: `IDLE_MS = 5 * 60 * 1000`, `WARN_MS = 60 * 1000` (último minuto pisca + `aria-live`).
- Ao expirar: `authService.signOut()` + limpeza de caches sensíveis + redirect `/login?reason=idle` com toast.
- Componente `SessionTimer` no header do `AppLayout` (mm:ss, ícone relógio, cor muda no warning).
- Pausa quando aba está em background? **Pergunto abaixo.**

### Frente 2 — Sessão única por utilizador

Tabela `auth_app_sessions`:

```text
id uuid PK
user_id uuid (FK auth.users)
session_jti text          -- hash do refresh token / id único do device
device_label text         -- "Chrome 120 / macOS"
ip text (nullable, LGPD)
created_at, last_seen_at
revoked_at (nullable)
revoked_reason text       -- 'replaced','idle','manual','admin'
```

Fluxo no login (Edge Function `auth-register-session` com service role):

1. Cliente faz `signInWithPassword` → recebe sessão.
2. Cliente chama edge function com JWT + `device_fingerprint` (UA + canvas hash leve).
3. Edge function (política a confirmar): **novo desliga antigo** (recomendado) — marca sessões anteriores `revoked_at=now(), reason='replaced'`, insere nova activa, dispara realtime `auth-sessions:user_id` para o antigo.
4. Cliente antigo escuta canal → toast "Sessão terminada noutro dispositivo" → `signOut()` + redirect.

Validação contínua: hook no `AppLayout` faz heartbeat a cada 60s para edge function `auth-heartbeat` que valida `session_jti` ainda activa. Se revogada → signOut imediato. Não confia só no JWT (que continua válido até expirar).

Alertas:
- Insert em `security_events` (nova tabela ou reutilizar `settings_audit_logs`) com tipo `concurrent_login_replaced` ou `concurrent_login_blocked`.
- Notificação in-app para admins da empresa via tabela `notifications` (já existe).
- Email opcional via edge function (deixo desligado por padrão, flag).

### Frente 3 — Default deny de rotas (já feito anteriormente)

Confirmar que testes ainda passam após estas mudanças.

### Detalhes técnicos

- **RLS**: `auth_app_sessions` — user vê só suas linhas; service role faz writes.
- **Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE auth_app_sessions`.
- **Edge functions**: `auth-register-session`, `auth-heartbeat`, `auth-revoke-session` (logout manual de outras sessões em "Minhas Sessões" — futuro).
- **JWT TTL**: documentar em README que sessão única "forte" depende do heartbeat porque o JWT permanece válido até expirar (Supabase limit).
- **Sem MFA / rate-limit servidor / CSP nesta entrega** — listo como follow-ups.

### Ficheiros a tocar

- `src/shared/auth/useIdleSession.ts` (novo)
- `src/shared/auth/useSessionEnforcement.ts` (novo — heartbeat + realtime)
- `src/shared/auth/sessionFingerprint.ts` (novo)
- `src/shared/components/SessionTimer.tsx` (novo)
- `src/shared/layouts/AppLayout.tsx` (integra hooks + timer no header)
- `src/shared/auth/authService.ts` (chama register-session após login; limpa session local no logout)
- `supabase/migrations/<ts>_auth_app_sessions.sql`
- `supabase/functions/auth-register-session/index.ts`
- `supabase/functions/auth-heartbeat/index.ts`
- `src/pages/Login.tsx` (mostrar `?reason=idle|replaced` em toast)

### Perguntas antes de implementar

Listo abaixo via `ask_questions` — 4 decisões de produto que mudam comportamento.
