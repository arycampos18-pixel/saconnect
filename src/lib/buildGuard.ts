/**
 * Build Guard — detecta novo deploy e força nova sessão.
 *
 * Como funciona:
 *  1. Em cada build o Vite injeta __BUILD_EPOCH__ (timestamp Unix em ms).
 *  2. Ao carregar, comparamos com o valor salvo em localStorage.
 *  3. Se diferente → novo deploy: limpamos o storage, fazemos sign-out do
 *     Supabase e recarregamos para o usuário começar uma sessão limpa.
 *
 * Efeito prático: quando o servidor é reiniciado com um novo build,
 * o browser detecta na próxima visita e encerra a sessão antiga.
 */

const STORAGE_KEY = "sa_build_epoch";

/** Retorna o epoch do build atual injetado pelo Vite. */
function currentEpoch(): string {
  try {
    return String(__BUILD_EPOCH__);
  } catch {
    return "";
  }
}

/**
 * Executa o guard de build.
 * Chame o mais cedo possível (antes de renderizar o React).
 *
 * @param signOutFn  Função assíncrona de sign-out (ex: supabase.auth.signOut).
 *                   Opcional — se omitida apenas limpa o storage local.
 */
export async function runBuildGuard(
  signOutFn?: () => Promise<unknown>,
): Promise<void> {
  const epoch = currentEpoch();
  if (!epoch) return; // dev sem __BUILD_EPOCH__ definido

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === null) {
    // Primeira visita neste browser: só registra o epoch atual.
    localStorage.setItem(STORAGE_KEY, epoch);
    return;
  }

  if (stored === epoch) return; // mesma versão — sem ação

  // ── Novo deploy detectado ────────────────────────────────────────────────
  // 1. Sign-out Supabase (invalida sessão autenticada)
  try {
    await signOutFn?.();
  } catch {
    /* segue mesmo se falhar */
  }

  // 2. Limpa todo o storage local (cache de queries, preferências, tokens)
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* segue */
  }

  // 3. Grava o novo epoch para não entrar em loop de reload
  try {
    localStorage.setItem(STORAGE_KEY, epoch);
  } catch {
    /* segue */
  }

  // 4. Recarrega a página — o browser vai buscar o novo index.html
  //    (Nginx deve servir index.html com Cache-Control: no-store)
  window.location.reload();
}
