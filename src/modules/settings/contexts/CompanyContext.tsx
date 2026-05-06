import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { settingsService, type SettingsCompany } from "../services/settingsService";

interface CompanyContextValue {
  loading: boolean;
  companies: SettingsCompany[];
  currentCompany: SettingsCompany | null;
  isSuperAdmin: boolean;
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  changeCompany: (companyId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<CompanyContextValue | null>(null);
const STORAGE_KEY = "sa_active_company_id";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [companies, setCompanies] = useState<SettingsCompany[]>([]);
  const [currentCompany, setCurrentCompany] = useState<SettingsCompany | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async (profileId: string | null) => {
    if (!profileId) { setPermissions([]); return; }
    try {
      const perms = await settingsService.permissoesDoPerfil(profileId);
      setPermissions(perms);
    } catch { setPermissions([]); }
  }, []);

  const reload = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const sb: any = supabase;
      const { data: me } = await sb.from("settings_users").select("is_super_admin").eq("id", user.id).maybeSingle();
      const superAdmin = !!me?.is_super_admin;
      setIsSuperAdmin(superAdmin);

      const links = await settingsService.listarEmpresasDoUsuario(user.id);
      const mapped = links.map((l) => l.settings_companies as SettingsCompany).filter(Boolean);
      setCompanies(mapped);

      const savedId = localStorage.getItem(STORAGE_KEY);
      const chosen =
        links.find((l) => l.company_id === savedId) ||
        links.find((l) => l.is_default) ||
        links[0];
      const company = (chosen?.settings_companies as SettingsCompany) || null;
      setCurrentCompany(company);
      if (company) localStorage.setItem(STORAGE_KEY, company.id);
      await loadPermissions(chosen?.profile_id ?? null);
    } finally {
      setLoading(false);
    }
  }, [user, loadPermissions]);

  useEffect(() => { reload(); }, [reload]);

  const changeCompany = useCallback(async (companyId: string) => {
    if (!user) return;
    const links = await settingsService.listarEmpresasDoUsuario(user.id);
    const link = links.find((l) => l.company_id === companyId);
    if (!link) return;
    setCurrentCompany(link.settings_companies as SettingsCompany);
    localStorage.setItem(STORAGE_KEY, companyId);
    await loadPermissions(link.profile_id ?? null);
    // Invalida todo o cache para evitar vazamento de dados entre tenants
    queryClient.clear();
  }, [user, loadPermissions, queryClient]);

  const hasPermission = useCallback(
    (perm: string) => isSuperAdmin || permissions.includes(perm),
    [isSuperAdmin, permissions]
  );

  return (
    <Ctx.Provider value={{ loading, companies, currentCompany, isSuperAdmin, permissions, hasPermission, changeCompany, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}