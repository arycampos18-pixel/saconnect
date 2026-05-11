# SA Connect

Repositório: [github.com/arycampos18-pixel/saconnect](https://github.com/arycampos18-pixel/saconnect)

## Deploy na VPS (Ubuntu + Nginx)

Substitua **nada** por “URL_DO_REPO”: use exatamente estes comandos.

```bash
sudo apt update && sudo apt install -y git nginx curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo mkdir -p /var/www && sudo chown "$USER:$USER" /var/www
cd /var/www
git clone https://github.com/arycampos18-pixel/saconnect.git
cd saconnect
cp .env.example .env && nano .env
npm ci
npm run build
chmod +x scripts/lightsail-setup.sh
bash scripts/lightsail-setup.sh
```

No painel da nuvem (ex.: Lightsail), libere a porta **HTTP 80**. Abra `http://SEU_IP_PUBLICO`.  
Se mudar o `.env`, rode de novo: `npm run build` e `bash scripts/lightsail-setup.sh` (ou só `sudo systemctl reload nginx` se o `root` já apontar para `dist`).

### Deploy AWS EC2 (Ubuntu AMI)

1. **Security group** da instância (EC2 → Rede → clicar no grupo): regras de entrada  
   - **SSH 22** — origem: o teu IP (`Meu IP` no consola) ou temporariamente `0.0.0.0/0` (menos seguro).  
   - **HTTP 80** — origem: `0.0.0.0/0` (para o site abrir no browser).  
   - **HTTPS 443** — opcional por agora; necessário depois de configurares TLS (Certbot / ALB).

2. **Ligar por SSH** (AMI Ubuntu: utilizador `ubuntu`, não `admin`):

   ```bash
   ssh -i /caminho/Samuel_02.pem ubuntu@SEU_IP_PUBLICO
   ```

3. **Na instância**, os mesmos comandos da secção **Deploy na VPS** acima (`/var/www/saconnect`, `.env`, `bash scripts/lightsail-setup.sh`). O script configura o Nginx a servir a pasta `dist` do clone.

4. **IP elástico**: sem ele, o IPv4 público muda ao parar/iniciar a VM. Para produção, associa um [Elastic IP](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html) à instância.

5. **Supabase**: em **Authentication → URL Configuration**, inclui `http://SEU_IP_PUBLICO` (e o domínio futuro com `https://`) em **Site URL** e **Redirect URLs**.

6. **t3.micro (1 GiB RAM)**: o `npm run build` pode falhar por falta de memória. Se acontecer, cria [swap](https://ubuntu.com/server/docs/swap-space) ou faz o build no PC e envia só a pasta `dist` (ver `npm run publish:dist` e `PROMPT_IA_SUPABASE_E_VPS.md`).

## Banco de dados: nuvem, local ou “só PostgreSQL”?

O aplicativo **não fala com PostgreSQL direto pelo navegador**. Ele usa o **Supabase** (`@supabase/supabase-js`): API REST (PostgREST), **Auth**, **Realtime** e **Edge Functions**. O PostgreSQL do Supabase é o armazenamento por trás dessa API.

| Abordagem | O que você obtém |
|-----------|-------------------|
| **Supabase na nuvem** (atual) | Menos manutenção; use `VITE_SUPABASE_*` do painel. |
| **Supabase local no PC** (`supabase start`) | Postgres + API + Auth no Docker; bom para desenvolvimento. |
| **Supabase self-hosted na VPS** (Docker oficial) | Postgres “local” na sua máquina + APIs compatíveis com o app. Exige RAM (ideal **≥ 2 GB**; 512 MB não recomendado). |
| **Apenas PostgreSQL instalado** | **Não basta** para este frontend: faltam Auth, PostgREST, funções, etc. Só faria sentido com um **backend novo** reescrevendo todos os serviços. |

### Desenvolvimento local com stack Supabase (recomendado)

```bash
npm run supabase:start
# Em outro terminal, gere o .env a partir do CLI:
npm run supabase:env-for-vite
# Copie as linhas VITE_* para o seu .env e suba o Vite:
npm run dev
```

Documentação do CLI: [Supabase Local Development](https://supabase.com/docs/guides/cli/getting-started).

### VPS com banco “local” (self-hosted)

Siga o guia oficial [Self-Hosting com Docker](https://supabase.com/docs/guides/self-hosting/docker): o stack inclui PostgreSQL e a mesma API que o app já usa. Depois configure o `.env` de produção com a URL do Kong/API e as chaves **anon** / JWT geradas no `.env` do Docker (veja comentários em `.env.example`).

Para **só aplicar o schema SQL** em um Postgres qualquer (por exemplo após subir o container `db`), use:

```bash
export DATABASE_URL="postgresql://USER:SENHA@localhost:5432/postgres"
bash scripts/apply-supabase-migrations.sh
```

Isso **não** substitui o Supabase na aplicação; apenas carrega as migrações da pasta `supabase/migrations/`.

### Deploy estático (Lightsail)

Instruções completas na seção **Deploy na VPS** acima. Arquivos: `scripts/lightsail-setup.sh`, `.env.example`.
