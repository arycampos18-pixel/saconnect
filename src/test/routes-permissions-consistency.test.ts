/**
 * Consistência rotas ↔ permissões (default DENY).
 *
 * Este teste falha quando:
 *   (a) Existe uma rota `<Route path="...">` sob /app em App.tsx que NÃO
 *       está mapeada em ROUTE_PERMISSIONS nem em ROUTE_WHITELIST.
 *   (b) Existe um URL no AppSidebar (`url: "/app/..."`) que não passa em
 *       canAccessRoute para um super admin (ou seja, não está mapeado e
 *       não está whitelisted).
 *   (c) Existe uma chave em ROUTE_PERMISSIONS apontando para uma
 *       permission_id que NÃO existe em public.settings_permissions.
 *
 * Usa parsing estático para evitar montar o app inteiro.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ROUTE_PERMISSIONS,
  ROUTE_WHITELIST,
  isWhitelistedRoute,
  getRequiredPermission,
} from "@/shared/auth/routePermissions";
import { KNOWN_PERMISSIONS } from "./fixtures/known-permissions";

const root = resolve(__dirname, "..", "..");
const appSrc = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const sidebarSrc = readFileSync(resolve(root, "src/shared/layout/AppSidebar.tsx"), "utf8");

/** Reproduz aninhamento de <Route path="..."> em App.tsx para gerar pathnames absolutos. */
function collectAppRoutePaths(source: string): string[] {
  const lines = source.split("\n");
  const stack: string[] = [];
  const routes = new Set<string>();
  const openRe = /<Route\s+[^>]*\bpath="([^"]+)"[^>]*>(?!\s*<\/Route>)/;
  const selfRe = /<Route\s+[^>]*\bpath="([^"]+)"[^>]*\/>/;
  const inlineRe = /<Route\s+[^>]*\bpath="([^"]+)"[^>]*>[\s\S]*?<\/Route>/;
  const closeRe = /<\/Route>/;

  const join = (leaf: string) => {
    const segs = [...stack, leaf].filter(Boolean).map((s) => s.replace(/^\/+|\/+$/g, ""));
    return "/" + segs.filter(Boolean).join("/");
  };

  for (const raw of lines) {
    const line = raw.trim();
    let m = selfRe.exec(line);
    if (m) { routes.add(join(m[1])); continue; }
    m = inlineRe.exec(line);
    if (m) { routes.add(join(m[1])); continue; }
    m = openRe.exec(line);
    if (m) { stack.push(m[1]); routes.add(join("")); continue; }
    if (closeRe.test(line)) stack.pop();
  }
  return [...routes];
}

/** Substitui :params por algo concreto para podermos testar contra o mapa de prefixos. */
function concretize(path: string): string {
  return path.replace(/:[A-Za-z0-9_]+\*?/g, "x").replace(/\*$/, "");
}

function extractSidebarUrls(source: string): string[] {
  const re = /\burl:\s*"([^"]+)"/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out.push(m[1]);
  return out.filter((u) => u.startsWith("/app"));
}

const allAppRoutes = collectAppRoutePaths(appSrc).filter((p) => p.startsWith("/app"));
const sidebarUrls = extractSidebarUrls(sidebarSrc);

describe("routes ↔ permissions consistency", () => {
  it("toda rota /app de App.tsx está mapeada ou na lista branca (default deny)", () => {
    const orphans: string[] = [];
    for (const route of allAppRoutes) {
      const test = concretize(route);
      if (test === "/app") continue; // landing autenticada está em ROUTE_WHITELIST
      if (isWhitelistedRoute(test)) continue;
      if (getRequiredPermission(test) !== null) continue;
      orphans.push(route);
    }
    expect(orphans, `Rotas sem mapeamento (acrescente em ROUTE_PERMISSIONS ou ROUTE_WHITELIST):\n  ${orphans.join("\n  ")}`).toEqual([]);
  });

  it("toda URL do sidebar resolve para uma permissão (ou whitelist)", () => {
    const orphans: string[] = [];
    for (const url of sidebarUrls) {
      if (isWhitelistedRoute(url)) continue;
      if (getRequiredPermission(url) !== null) continue;
      orphans.push(url);
    }
    expect(orphans, `URLs do sidebar sem permissão mapeada:\n  ${orphans.join("\n  ")}`).toEqual([]);
  });

  it("toda permission_id em ROUTE_PERMISSIONS existe em settings_permissions", () => {
    const known = new Set(KNOWN_PERMISSIONS);
    const invalid: Array<[string, string]> = [];
    for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
      if (!known.has(perm)) invalid.push([route, perm]);
    }
    expect(
      invalid,
      `Permissões inexistentes no BD (crie via migração ou ajuste o mapa):\n${invalid
        .map(([r, p]) => `  ${r} → ${p}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("ROUTE_WHITELIST não sobrepõe ROUTE_PERMISSIONS", () => {
    const conflicts = ROUTE_WHITELIST.filter((p) => p in ROUTE_PERMISSIONS);
    expect(conflicts, `Rotas simultaneamente whitelisted e mapeadas: ${conflicts.join(", ")}`).toEqual([]);
  });
});