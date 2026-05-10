# Scripts de migração SA Connect

Pré-requisitos: `psql`, `pg_dump`, `pg_restore` 15+, `supabase` CLI ≥ 1.200, `jq`.

Variáveis obrigatórias no shell antes de correr qualquer script:

```bash
export SRC_REF=ktwdgnkurtalclsgxfov
export DST_REF=<NEW_REF>
export SRC_DB="postgresql://postgres:<SRC_PWD>@db.${SRC_REF}.supabase.co:5432/postgres"
export DST_DB="postgresql://postgres:<DST_PWD>@db.${DST_REF}.supabase.co:5432/postgres"
```

Ordem de execução:

1. `dump-public-data.sh`     — exporta dados do schema `public` da origem.
2. `restore-public-data.sh`  — restaura no destino (schema já aplicado via `supabase db push`).
3. `reset-sequences.sh`      — reajusta `serial`/`identity` sequences.
4. `dump-restore-auth.sh`    — copia `auth.users`, `auth.identities`, MFA.
5. `copy-storage.sh <bucket>` — sincroniza um bucket de Storage (correr para cada).
6. `verify-counts.sh`        — diff `count(*)` por tabela origem vs destino.

Ver `MIGRATION.md` na raiz do repo para o procedimento completo.