import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { settingsService, type SettingsCompany } from "../services/settingsService";

interface CompanyContextValue {
  loading: boolean;
  switching: boolean;
  companies: SettingsCompany[];
  currentCompany: SettingsCompany | null;
  isSuperAdmin: boolean;
  permissions: string[];
  permissionsReady: boolean;
  hasPermission: (perm: string) => boolean;
  changeCompany: (companyId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<CompanyContextValue | null>(null);
const STORAGE_KEY_PREFIX = "sa_active_company_id";
const storageKey = (userId?: string | null) =>
  userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX;

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [companies, setCompanies] = useState<SettingsCompany[]>([]);
  const [currentCompany, setCurrentCompany] = useState<SettingsCompany | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const loadPermissions = useCallback(async (profileId: string | null) => {
    if (!profileId) { setPermissions([]); setPermissionsReady(true); return; }
    try {
      const perms = await settingsService.permissoesDoPerfil(profileId);
      setPermissions(perms);
    } catch { setPermissions([]); }
    finally { setPermissionsReady(true); }
  }, []);

  // Avisa o servidor qual empresa está ativa nesta sessão.
  // RLS RESTRICTIVE em tabelas com company_id valida contra esse valor.
  const syncActiveCompanyServer = useCallback(async (companyId: string | null) => {
    try {
      const sb: any = supabase;
      await sb.rpc("set_active_company", { _company_id: companyId });
    } catch (err) {
      // não bloqueia a UI; o pior caso é cair no default_company server-side
      console.warn("set_active_company falhou", err);
    }
  }, []);

  const reload = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setCurrentCompany(null);
      setPermissions([]);
      setPermissionsReady(true);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setPermissionsReady(false);
    try {
      const sb: any = supabase;
      const { data: me } = await sb.from("settings_users").select("is_super_admin").eq("id", user.id).maybeSingle();
      const superAdmin = !!me?.is_super_admin;
      setIsSuperAdmin(superAdmin);

      // Apenas vínculos ATIVOS do usuário atual
      const links = (await settingsService.listarEmpresasDoUsuario(user.id)).filter(
        (l) => l.status === "active" && !!l.settings_companies,
      );
      const mapped = links.map((l) => l.settings_companies as SettingsCompany);
      setCompanies(mapped);

      // savedId é por-usuário e só vale se ainda existir vínculo ativo
      const savedKey = storageKey(user.id);
      const savedId = localStorage.getItem(savedKey);
      const chosen =
        (savedId ? links.find((l) => l.company_id === savedId) : undefined) ||
        links.find((l) => l.is_default) ||
        links[0] ||
        null;

      // Limpa qualquer chave legada de outro usuário
      localStorage.removeItem(STORAGE_KEY_PREFIX);

      if (!chosen) {
        setCurrentCompany(null);
        setPermissions([]);
        setPermissionsReady(true);
        localStorage.removeItem(savedKey);
        await syncActiveCompanyServer(null);
      } else {
        const company = chosen.settings_companies as SettingsCompany;
        // 1) sincroniza empresa ativa no servidor ANTES de qualquer query
        await syncActiveCompanyServer(company.id);
        // 2) aplica no estado local
        setCurrentCompany(company);
        localStorage.setItem(savedKey, company.id);
        // 3) carrega permissões SOMENTE do profile vinculado a esta empresa
        await loadPermissions(chosen.profile_id ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, loadPermissions, syncActiveCompanyServer]);

  useEffect(() => { reload(); }, [reload]);

  const changeCompany = useCallback(async (companyId: string) => {
    if (!user) return;
    setSwitching(true);
    try {
      const links = await settingsService.listarEmpresasDoUsuario(user.id);
      const link = links.find(
        (l) => l.company_id === companyId && l.status === "active" && !!l.settings_companies,
      );
      if (!link) return;
      // Limpa permissões + cache de queries ANTES de aplicar a nova empresa.
      setPermissions([]);
      setPermissionsReady(false);
      queryClient.clear();
      // Atualiza a empresa ativa no servidor PRIMEIRO — a partir daqui o
      // RLS RESTRICTIVE só aceita rows da nova empresa.
      await syncActiveCompanyServer(companyId);
      setCurrentCompany(link.settings_companies as SettingsCompany);
      localStorage.setItem(storageKey(user.id), companyId);
      await loadPermissions(link.profile_id ?? null);
    } finally {
      setSwitching(false);
    }
  }, [user, loadPermissions, queryClient, syncActiveCompanyServer]);

  const hasPermission = useCallback(
    (perm: string) => isSuperAdmin || permissions.includes(perm),
    [isSuperAdmin, permissions]
  );

  return (
    <Ctx.Provider value={{ loading, switching, companies, currentCompany, isSuperAdmin, permissions, permissionsReady, hasPermission, changeCompany, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}