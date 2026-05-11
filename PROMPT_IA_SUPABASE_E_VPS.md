# Prompt para outra IA — Supabase, repo e deploy na VPS (Debian)

Copia o bloco entre as linhas `---` para outra IA. **Substitui** os valores entre `[...]` pelos teus (painel Supabase: *Project Settings*). **Não** commits este ficheiro com segredos preenchidos.

---

## Contexto para a IA

Sou humano a configurar o projecto **SA Connect** (Vite + React + Supabase). O código está num repositório Git; o frontend usa `@supabase/supabase-js` e variáveis `VITE_SUPABASE_*` definidas em `.env` na **raiz do repo** (ver `.env.example`).

### O que preciso que faças

1. Confirmar que consegues orientar-me a usar o **Supabase** (API REST, Auth, Storage, Edge Functions) com os dados do projecto.
2. Se for deploy na **VPS Debian**: garantir que os comandos correm **dentro da pasta do clone do repo** (onde existe `package.json`), usando **sintaxe Bash**, não PowerShell.

### Dados do projecto Supabase (preencher pelo humano)

- **Project URL (API):** `[https://XXXX.supabase.co]`
- **Project ref (ID):** `[xxxx]` (subdomínio antes de `.supabase.co`)
- **Chave publishable (anon / public):** `[sb_publishable_... ou eyJ...]`
- **Chave service_role** (só servidor/CI, nunca no browser): `[só se precisares de operações admin; do painel API keys]`
- **Ligação Postgres (migrações / psql):** `[postgresql://postgres:SENHA@db.XXXX.supabase.co:5432/postgres]`  
  - Preferir **Session pooler** no painel se IPv4 da VPS falhar na porta 5432 directa.

### Ficheiros relevantes no repo

- `package.json` — scripts `build`, `supabase:migrate:remote`, `publish:dist`
- `vite.config.ts` — injeta `VITE_SUPABASE_*` no build
- `src/integrations/supabase/client.ts` — cliente browser
- `supabase/migrations/` — SQL das migrações
- `scripts/vps-deploy.sh` — build na VPS Linux + opcional `WEB_ROOT=...`
- `scripts/publish-dist.ps1` — só **Windows PowerShell**; na VPS usar bash ou só `scp`
- `scripts/push-supabase-migrations.ps1` — migrações remotas (usa `DATABASE_URL` ou `.env.supabase.local`)
- `deploy/nginx-site.conf.example` — Nginx para SPA

### Regras de segurança

- A **service_role** e a **password do Postgres** não vão para código commitado nem para o frontend.
- No Supabase: **Authentication → URL Configuration** deve incluir o URL público da app (Site URL + Redirect URLs).

### Erros comuns na VPS (evitar)

- **`/caminho/onde/clonaste/o-repositorio` não existe** — isso era só um **exemplo** no tutorial. Na VPS tens de usar um caminho **real**, por exemplo `/home/admin/sa-connect` (o nome da pasta é o que escolheres ao clonar).
- `chmod: cannot access 'scripts/vps-deploy.sh'` → não estás na pasta do repo, ou o repo **nunca foi clonado** para a VPS.
- `npm error ... package.json ENOENT` → o `npm` tem de correr na pasta onde está o `package.json` (raiz do clone).
- Na VPS **Bash**, não uses `$env:VAR = "..."` (isso é PowerShell). Usa `export VAR="valor"`.

### Encontrar o projecto na VPS (se já clonaste algures)

```bash
find /home/admin -name "package.json" 2>/dev/null
# Quando aparecer algo como /home/admin/projetos/foo/package.json:
cd /home/admin/projetos/foo
ls package.json scripts/vps-deploy.sh
```

### Se ainda **não** tens o código na VPS — clonar primeiro

Substitui `URL_DO_TEU_GIT` pelo URL real (GitHub, GitLab, etc.):

```bash
cd /home/admin
git clone URL_DO_TEU_GIT sa-connect
cd /home/admin/sa-connect
ls package.json
```

### Fluxo mínimo na VPS (Debian), **dentro da pasta do clone**

Troca `~/sa-connect` se usaste outro nome ou caminho ao clonar.

```bash
cd ~/sa-connect
cp .env.example .env               # editar: nano .env  →  VITE_SUPABASE_*
chmod +x scripts/vps-deploy.sh
WEB_ROOT=/var/www/sa-connect ./scripts/vps-deploy.sh
```

### Fluxo no Windows (PowerShell), build local + enviar dist

Substitui o caminho pelo da **tua** pasta do projecto no PC (não uses literalmente `C:\caminho\para\o\repo`).

```powershell
cd "C:\Sistema\SAmuel\SA Connect_ Smart Political Relations (1)"
npm run build
$env:DEPLOY_HOST = "admin@IP_OU_DOMINIO"
$env:DEPLOY_PATH = "/var/www/sa-connect"
npm run publish:dist
```

### O que quero como resposta da IA

Passos concretos (comandos) para: (1) validar ligação ao Supabase; (2) listar ou aplicar migrações se necessário; (3) deploy do frontend na VPS com Nginx; (4) checklist do painel Supabase (URLs, CORS se aplicável).

---

## Nota para mim (humano)

O ficheiro `PROMPT_IA_SUPABASE_E_VPS.md` usa **placeholders** `[...]`. Antes de enviar o prompt a outra IA, abre o painel Supabase e substitui no texto copiado, ou anexa um `.env` **só em canal privado**, nunca em repo público.
