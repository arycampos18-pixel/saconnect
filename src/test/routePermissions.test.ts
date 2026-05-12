import { describe, it, expect } from "vitest";
import {
  getRequiredPermission,
  canAccessRoute,
  findFallbackRoute,
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
      "/app/hub/configuracoes",
      "/app/hub/whatsapp",
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

  it("rotas livres (sem permissão mapeada) são liberadas", () => {
    expect(canAccessRoute("/app/perfil", hasNone, false)).toBe(true);
    expect(canAccessRoute("/app/dashboard", hasNone, false)).toBe(true);
  });

  it("findFallbackRoute do cabo aponta para /app/political/meus-eleitores", () => {
    expect(findFallbackRoute(hasCabo)).toBe("/app/political/meus-eleitores");
    expect(findFallbackRoute(hasNone)).toBe("/app/perfil");
  });
});
