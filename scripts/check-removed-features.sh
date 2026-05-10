#!/usr/bin/env bash
# Falha o build se sobrar qualquer referência a features removidas.
# Atualize FORBIDDEN ao remover novos módulos.
set -euo pipefail

FORBIDDEN=(
  'Logística'
  'Logistica'
  'logistica'
  'MateriaisLogistica'
  'Implantação Final'
  'Implantacao'
  'implantacao'
  'AnaliseImplantacao'
)

# Caminhos a ignorar (lockfiles, build, este script e o workflow).
IGNORE=(
  '!**/node_modules/**'
  '!**/dist/**'
  '!**/build/**'
  '!**/.next/**'
  '!**/coverage/**'
  '!bun.lockb'
  '!package-lock.json'
  '!pnpm-lock.yaml'
  '!scripts/check-removed-features.sh'
  '!.github/workflows/check-removed-features.yml'
  '!supabase/migrations/**'
)

GLOBS=()
for g in "${IGNORE[@]}"; do GLOBS+=(--glob "$g"); done

FAIL=0
for term in "${FORBIDDEN[@]}"; do
  if rg -n --hidden "${GLOBS[@]}" -- "$term" .; then
    echo "❌ Termo proibido encontrado: '$term'"
    FAIL=1
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "Build bloqueado: remova as referências acima ou atualize scripts/check-removed-features.sh."
  exit 1
fi

echo "✅ Nenhuma referência a features removidas encontrada."