# Migração SA Connect — Supabase Origem → Supabase Destino (próprio)

> Documento operacional. Executar **fora do Lovable**, na tua máquina, com Supabase CLI ≥ 1.200 e `psql`/`pg_dump` 15+.
> Estratégia: **blue/green** — destino preparado e validado em paralelo; cutover só troca `.env`.

## 0. Identificação

| | Origem (actual) | Destino (novo) |
|---|---|---|
| Project ref | `ktwdgnkurtalclsgxfov` | `<NEW_REF>` |
| URL | `https://ktwdgnkurtalclsgxfov.supabase.co` | `https://<NEW_REF>.supabase.co` |
| Região | (confirmar no dashboard) | escolher próxima do utilizador final |
| DB password | (cofre) | (cofre) |

Antes de começar exporta no shell:
```bash
export SRC_REF=ktwdgnkurtalclsgxfov
export DST_REF=<NEW_REF>
export SRC_DB="postgresql://postgres:<SRC_PWD>@db.${SRC_REF}.supabase.co:5432/postgres"
export DST_DB="postgresql://postgres:<DST_PWD>@db.${DST_REF}.supabase.co:5432/postgres"
```

## 1. Inventário do repositório (já levantado)

- **117 migrations** em `supabase/migrations/` — aplicar todas, por ordem alfabética do filename (timestamp prefix).
- **48 Edge Functions** em `supabase/functions/` — todas precisam de deploy no destino.
- **15 funções com `verify_jwt = false`** (webhooks públicos) — replicar `supabase/config.toml`.
- **2 buckets de Storage**: `db-backups`, `whatsapp-media`.
- **Auth**: signups confirm email = ON (não auto-confirm). Trigger `handle_new_user` cria `profiles` + `user_roles`.
- **Realtime**: tabelas `notifications`, `whatsapp_*`, `auth_app_sessions` (verificar `supabase_realtime` publication na origem).
- **Cron interno**: `cron_disparos_tick()` chama `net.http_post` com URL hardcoded da origem — **precisa update após cutover**.

### Secrets de Edge Functions a replicar no destino
(além dos auto-injectados `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)

```
ANALISE_ELEITORAL_API_KEY
ANALISE_ELEITORAL_API_PASSWORD
ANALISE_ELEITORAL_API_URL
ANALISE_ELEITORAL_API_USER
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
INFOSIMPLES_TOKEN
LOVABLE_API_KEY
META_APP_ID
META_APP_SECRET
TWILIO_API_KEY
WA_BULK_WEBHOOK_VERIFY_TOKEN
ZAPI_CLIENT_TOKEN
ZAPI_INSTANCE_ID
ZAPI_INSTANCE_TOKEN
ZAPI_PARTNER_TOKEN
```
`VITE_*` ficam no `.env` do frontend, não nas functions.

## 2. Criar e linkar destino

1. Cria projecto em supabase.com → guarda `NEW_REF`, `anon key`, `service_role`, DB password.
2. **Auth → URL Configuration**: Site URL e Redirect URLs = domínio real do app.
3. **Auth → Providers**: replicar Google/Email exactamente como na origem.
4. **Auth → Policies**: senha mínima e HIBP iguais à origem.
5. Link CLI:
   ```bash
   supabase link --project-ref $DST_REF
   ```

## 3. Aplicar schema no destino

```bash
supabase db push        # aplica tudo em supabase/migrations/ por ordem
```
Se algo falhar, aplica manualmente uma a uma:
```bash
for f in supabase/migrations/*.sql; do
  echo "==> $f"
  psql "$DST_DB" -v ON_ERROR_STOP=1 -f "$f" || break
done
```
Verifica:
```bash
psql "$DST_DB" -c "select count(*) from pg_tables where schemaname='public';"
psql "$DST_DB" -c "select count(*) from pg_policies where schemaname='public';"
```

## 4. Cópia de dados — schema `public`

Usa `scripts/migration/dump-public-data.sh` e `restore-public-data.sh` (inclusos).
Ordem garantida pelo `pg_dump --data-only` que respeita FKs via `--disable-triggers`.

```bash
bash scripts/migration/dump-public-data.sh        # gera /tmp/saconnect-public.dump
bash scripts/migration/restore-public-data.sh     # restaura no destino
bash scripts/migration/verify-counts.sh           # diff COUNT(*) origem vs destino
```

Após restore:
```sql
-- reajustar sequences
select setval(pg_get_serial_sequence(quote_ident(schemaname)||'.'||quote_ident(tablename), columnname),
              (select coalesce(max(id),0)+1 from ...))
-- ver script reset-sequences.sh
```

## 5. Migração de Auth (utilizadores + senhas)

**Caminho oficial Supabase** (mantém password hashes — `bcrypt`/`scrypt`):

1. Abre ticket em supabase.com/dashboard/support → "Migrate auth.users from project A to project B" (entre projectos da mesma org é self-service via SQL; entre orgs requer suporte).
2. Alternativa self-service entre projectos da MESMA organização:
   ```bash
   pg_dump "$SRC_DB" \
     --schema=auth \
     --data-only \
     --table=auth.users \
     --table=auth.identities \
     --table=auth.mfa_factors \
     --table=auth.mfa_challenges \
     --on-conflict-do-nothing \
     -Fc -f /tmp/saconnect-auth.dump

   pg_restore -d "$DST_DB" --data-only --disable-triggers /tmp/saconnect-auth.dump
   ```
   ⚠️ Alguns campos (`encrypted_password`, `confirmation_token`) usam o `auth.jwt_secret` do projecto. Como a chave é diferente entre projectos, **logout global** será necessário; senhas continuam válidas porque o hash bcrypt não depende do JWT secret. Tokens de refresh actuais ficam inválidos — utilizadores fazem login de novo (sem reset).
3. Após restore, corre:
   ```sql
   -- garantir que profiles/user_roles existem (handle_new_user só dispara em INSERT)
   insert into public.profiles (user_id, nome, email)
     select u.id, coalesce(u.raw_user_meta_data->>'nome', split_part(u.email,'@',1)), u.email
     from auth.users u
     where not exists (select 1 from public.profiles p where p.user_id = u.id);

   insert into public.user_roles (user_id, role)
     select id, 'operador' from auth.users
     where not exists (select 1 from public.user_roles r where r.user_id = auth.users.id);
   ```

## 6. Migração de Storage

Para cada bucket (`db-backups`, `whatsapp-media`):

```bash
bash scripts/migration/copy-storage.sh db-backups
bash scripts/migration/copy-storage.sh whatsapp-media
```
(Usa CLI `supabase storage cp` em loop — script incluso.)

RLS dos buckets já vem nas migrations — verificar `storage.objects` policies depois.

## 7. Deploy de Edge Functions e secrets

```bash
# secrets (interactivo, um por um)
for k in ANALISE_ELEITORAL_API_KEY ANALISE_ELEITORAL_API_PASSWORD ANALISE_ELEITORAL_API_URL \
         ANALISE_ELEITORAL_API_USER GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET INFOSIMPLES_TOKEN \
         LOVABLE_API_KEY META_APP_ID META_APP_SECRET TWILIO_API_KEY \
         WA_BULK_WEBHOOK_VERIFY_TOKEN ZAPI_CLIENT_TOKEN ZAPI_INSTANCE_ID \
         ZAPI_INSTANCE_TOKEN ZAPI_PARTNER_TOKEN; do
  read -s -p "$k: " v && echo
  supabase secrets set --project-ref $DST_REF "$k=$v"
done

# deploy de todas as functions (config.toml já tem verify_jwt corretos)
supabase functions deploy --project-ref $DST_REF
```

## 8. Cron job interno — corrigir URL hardcoded

A função `cron_disparos_tick()` (em uma das migrations) tem hardcoded:
```
url := 'https://ktwdgnkurtalclsgxfov.supabase.co/functions/v1/disparo-processar'
```
No destino, executa:
```sql
create or replace function public.cron_disparos_tick() ...
-- substituir URL e apikey pelo NEW_REF e novo anon key
```
(Cria nova migration `supabase/migrations/<ts>_fix_cron_url.sql` no destino se quiseres versionar.)

## 9. Webhooks externos a actualizar

| Provider | URL antiga | URL nova |
|---|---|---|
| Z-API (envio) | `…/functions/v1/webhook-zapi` | trocar host pelo `NEW_REF` |
| Z-API (receptivo) | `…/functions/v1/webhook-zapi-receptivo` | idem |
| Meta WhatsApp | `…/functions/v1/whatsapp-meta-webhook` | idem (e re-verificar webhook no Meta) |
| Google OAuth | `…/functions/v1/tickets-google-oauth-callback` | actualizar Authorized redirect URI no GCP |
| Auto-cadastro | `…/functions/v1/auto-cadastro-submit` | actualizar QR codes públicos se URL muda |

## 10. Cutover do frontend

No CI/host (Vercel/VPS) substituir:
```
VITE_SUPABASE_URL=https://<NEW_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<NEW_ANON>
VITE_SUPABASE_PROJECT_ID=<NEW_REF>
```
`npm run build && deploy`. Smoke test antes de DNS swap.

## 11. Checklist de validação (assinar antes de desligar origem)

- [ ] `select count(*)` por tabela bate (script `verify-counts.sh`).
- [ ] Login email/password funciona com utilizador real.
- [ ] Login Google funciona.
- [ ] `set_active_company` + RLS isolam empresa A de empresa B.
- [ ] Página settings/users carrega permissões do utilizador.
- [ ] WhatsApp: enviar mensagem teste via `wa-bulk-send`.
- [ ] Tickets: criar e responder.
- [ ] Political: abrir lista de eleitores e filtrar.
- [ ] Disparos: agendar um e ver `cron_disparos_tick` processar.
- [ ] Edge function pública (ex. `webhook-zapi`) responde 200 sem JWT.
- [ ] Edge function privada (ex. `wa-bulk-send`) rejeita 401 sem JWT.
- [ ] Realtime de `notifications` chega ao cliente.
- [ ] `auth_app_sessions` revoga sessão antiga ao novo login.
- [ ] Storage: upload/download em ambos buckets.
- [ ] Backup snapshot manual do destino feito e guardado fora.

## 12. Rollback

Como o `.env` de produção é a única coisa que muda no cutover, rollback = repor `.env` antigo e rebuild. Mantém a origem **on-line por ≥ 14 dias** após cutover.

## 13. Encerramento

- Snapshot final da origem (`pg_dump -Fc`) guardado em S3/cofre.
- Pausa o projecto antigo (não apagar) durante 30 dias.
- Passados 30 dias sem incidente: cancelar projecto antigo.

---
**Janela de manutenção sugerida:** 60 min (15 min schema + 25 min dados + 10 min storage + 10 min smoke).
Para zero-downtime real, rever capítulo 5 (auth) com Supabase Support — sessões actuais serão sempre invalidadas.