import { describe, it, expect } from "vitest";
import {
  getRequiredPermission,
  canAccessRoute,
  findFallbackRoute,
  isWhitelistedRoute,
  isUnmappedAppRoute,
  ROUTE_PERMISSIONS,
  ROUTE_WHITELIST,
} from "@/shared/auth/routePermissions";

// Simula um "cabo eleitoral" cujo perfil só tem a permissão cabos.meus_eleitores
const caboPerms = new Set(["cabos.meus_eleitores"]);
const hasCabo = (p: string) => caboPerms.has(p);
const hasNone = () => false;

describe("routePermissions — cabo eleitoral", () => {
  it("usa o prefixo mais longo para resolver a permissão da rota", () => {
    expect(getRequiredPermission("/app/political/meus-eleitores")).toBe("cabos.meus_eleitores");
    expect(getRequiredPermission("/app/political/voters")).toBe("eleitores.view");
    expect(getRequiredPermission("/app/political")).toBe("analise.dashboard.view");
  });

  it("permite a rota fallback do cabo (/app/political/meus-eleitores)", () => {
    expect(canAccessRoute("/app/political/meus-eleitores", hasCabo, false)).toBe(true);
  });

  it("bloqueia rotas restritas mesmo digitando a URL manualmente", () => {
    const restritas = [
      "/app/political/voters",
      "/app/political/crm",
      "/app/political/cabos",
      "/app/political/liderancas",
      "/app/analise-de-eleitores",
      "/app/analise-de-eleitores/base",
      "/app/settings/users",
      "/app/settings/roles",
      "/app/whatsapp/chat",
      "/app/tickets/list",
      "/app/relatorios",
      "/app/captacao",
      "/app/eleitores",
    ];
    for (const r of restritas) {
      expect(canAccessRoute(r, hasCabo, false), `deveria bloquear ${r}`).toBe(false);
    }
  });

  it("super admin sempre passa", () => {
    expect(canAccessRoute("/app/settings/roles", hasNone, true)).toBe(true);
    expect(canAccessRoute("/app/political/voters", hasNone, true)).toBe(true);
  });

  it("rotas da lista branca são liberadas a qualquer autenticado", () => {
    expect(canAccessRoute("/app/perfil", hasNone, false)).toBe(true);
    expect(canAccessRoute("/app/dashboard", hasNone, false)).toBe(true);
    expect(canAccessRoute("/app/dashboard/principal", hasNone, false)).toBe(true);
    expect(canAccessRoute("/app", hasNone, false)).toBe(true);
    expect(canAccessRoute("/app/hub/configuracoes", hasNone, false)).toBe(true);
  });

  it("default DENY: /app não mapeado e fora da lista branca é bloqueado", () => {
    // Rota inexistente no mapa nem whitelisted → negada para qualquer não-superadmin
    expect(canAccessRoute("/app/rota-fantasma", hasNone, false)).toBe(false);
    expect(canAccessRoute("/app/rota-fantasma", hasCabo, false)).toBe(false);
    // Mas super admin passa
    expect(canAccessRoute("/app/rota-fantasma", hasNone, true)).toBe(true);
  });

  it("ignora querystring/hash ao avaliar permissão", () => {
    expect(getRequiredPermission("/app/configuracoes?tab=integracoes")).toBe("settings.dashboard.view");
    expect(canAccessRoute("/app/perfil?x=1", hasNone, false)).toBe(true);
  });

  it("rotas fora de /app não são geridas pelo guard (login, públicas)", () => {
    expect(canAccessRoute("/login", hasNone, false)).toBe(true);
    expect(canAccessRoute("/cadastro-publico", hasNone, false)).toBe(true);
  });

  it("findFallbackRoute do cabo aponta para /app/political/meus-eleitores", () => {
    expect(findFallbackRoute(hasCabo)).toBe("/app/political/meus-eleitores");
    expect(findFallbackRoute(hasNone)).toBe("/app/perfil");
  });

  it("ROUTE_WHITELIST e ROUTE_PERMISSIONS estão coerentes (sem sobreposição confusa)", () => {
    for (const wl of ROUTE_WHITELIST) {
      // Whitelisted entries shouldn't also be mapped (evita ambiguidade).
      expect(ROUTE_PERMISSIONS[wl], `${wl} não deve estar simultaneamente mapeado e whitelisted`).toBeUndefined();
    }
    expect(isWhitelistedRoute("/app/perfil")).toBe(true);
    expect(isUnmappedAppRoute("/app/rota-fantasma")).toBe(true);
    expect(isUnmappedAppRoute("/app/perfil")).toBe(false);
    expect(isUnmappedAppRoute("/app/settings/users")).toBe(false);
  });
});
