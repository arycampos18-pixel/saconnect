/**
 * Navegação: garante que todas as URLs declaradas no sidebar e nos
 * breadcrumbs apontem para rotas registradas em App.tsx, evitando
 * 404s ou telas em branco.
 *
 * Faz parsing estático (regex) — sem renderizar React — para ser rápido
 * e independente de mocks de Supabase / contextos.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..", "..");
const appSrc = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const sidebarSrc = readFileSync(resolve(root, "src/shared/layout/AppSidebar.tsx"), "utf8");
const breadcrumbsSrc = readFileSync(resolve(root, "src/shared/components/Breadcrumbs.tsx"), "utf8");

// --- Termos proibidos (features removidas) ----------------------------
const FORBIDDEN = ["logistica", "implantacao", "/auditoria", "aprovacoes"];

// --- 1. Constrói o conjunto de rotas válidas a partir do App.tsx ------
// Reproduz o aninhamento <Route path="..."> simples lendo as linhas em ordem.
function buildRouteSet(source: string): Set<string> {
  const lines = source.split("\n");
  const stack: string[] = [];
  const routes = new Set<string>();
  // Marca para rotas com `path` em uma linha e `</Route>` em outra (com filhos).
  const openRe = /<Route\s+[^>]*\bpath="([^"]+)"[^>]*>(?!\s*<\/Route>)/;
  const selfRe = /<Route\s+[^>]*\bpath="([^"]+)"[^>]*\/>/;
  const inlineRe = /<Route\s+[^>]*\bpath="([^"]+)"[^>]*>[\s\S]*?<\/Route>/;
  const closeRe = /<\/Route>/;

  for (const raw of lines) {
    const line = raw.trim();
    // self-closing
    let m = selfRe.exec(line);
    if (m) { routes.add(joinPath(stack, m[1])); continue; }
    // inline (open + close na mesma linha)
    m = inlineRe.exec(line);
    if (m) { routes.add(joinPath(stack, m[1])); continue; }
    // open (com filhos)
    m = openRe.exec(line);
    if (m) { stack.push(m[1]); routes.add(joinPath(stack, "")); continue; }
    if (closeRe.test(line)) stack.pop();
  }
  return routes;
}

function joinPath(stack: string[], leaf: string): string {
  const segs = [...stack, leaf].filter(Boolean).map((s) => s.replace(/^\/+|\/+$/g, ""));
  return "/" + segs.filter(Boolean).join("/");
}

const routes = buildRouteSet(appSrc);

// Regex p/ matching: cada rota vira uma RegExp com :params como [^/]+
const routeMatchers = [...routes].map((r) => ({
  raw: r,
  re: new RegExp("^" + r.replace(/:[A-Za-z0-9_]+\*?/g, "[^/]+").replace(/\*$/, ".*") + "/?$"),
}));

function isKnownRoute(url: string): boolean {
  // ignora query/hash
  const path = url.split("?")[0].split("#")[0];
  return routeMatchers.some((m) => m.re.test(path));
}

// --- 2. Extrai URLs do sidebar -----------------------------------------
function extractUrls(source: string): string[] {
  const re = /\burl:\s*"([^"]+)"/g;
  const out: string[] = [];
  let m;
  while ((m = re.exec(source))) out.push(m[1]);
  return out;
}

const sidebarUrls = extractUrls(sidebarSrc).filter((u) => u.startsWith("/"));

// --- 3. Extrai URLs do breadcrumbs -------------------------------------
function extractBreadcrumbUrls(source: string): string[] {
  const out = new Set<string>();
  // chaves "/app/...":
  const keyRe = /"(\/app\/[^"]+|\/cadastro-publico|\/p\/[^"]+)":/g;
  let m;
  while ((m = keyRe.exec(source))) out.add(m[1]);
  // valores "to: '/app/...'"
  const toRe = /\bto:\s*"([^"]+)"/g;
  while ((m = toRe.exec(source))) out.add(m[1]);
  return [...out].filter((u) => u.startsWith("/"));
}

const breadcrumbUrls = extractBreadcrumbUrls(breadcrumbsSrc);

// ----------------------------------------------------------------------

describe("Navegação · sidebar", () => {
  it("possui URLs declaradas", () => {
    expect(sidebarUrls.length).toBeGreaterThan(5);
  });

  it.each(sidebarUrls)("a rota %s existe em App.tsx", (url) => {
    expect(isKnownRoute(url), `Sidebar aponta para rota inexistente: ${url}`).toBe(true);
  });

  it("não contém features removidas", () => {
    const offenders = sidebarUrls.filter((u) => FORBIDDEN.some((t) => u.toLowerCase().includes(t)));
    expect(offenders, `URLs proibidas no sidebar: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("Navegação · breadcrumbs", () => {
  it("possui URLs declaradas", () => {
    expect(breadcrumbUrls.length).toBeGreaterThan(0);
  });

  it.each(breadcrumbUrls)("a rota %s existe em App.tsx", (url) => {
    expect(isKnownRoute(url), `Breadcrumb aponta para rota inexistente: ${url}`).toBe(true);
  });

  it("não contém features removidas", () => {
    const offenders = breadcrumbUrls.filter((u) => FORBIDDEN.some((t) => u.toLowerCase().includes(t)));
    expect(offenders, `URLs proibidas em breadcrumbs: ${offenders.join(", ")}`).toEqual([]);
  });
});