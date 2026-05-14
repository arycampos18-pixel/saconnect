import {
  Building2,
  UserCog,
  ShieldCheck,
  Activity,
  Share2,
  Database,
  Settings,
  Webhook,
  Bell,
} from "lucide-react";
import HubLayout from "./HubLayout";

export default function SettingsHub() {
  return (
    <HubLayout
      title="Configurações"
      subtitle="Centro de controle do sistema — empresas, usuários, permissões e integrações."
      icon={Settings}
      submodules={[
        { to: "/app/settings/companies", title: "Empresas / Tenants", description: "Multi-tenant e ambientes", icon: Building2 },
        { to: "/app/settings/users", title: "Usuários", description: "Cadastro, perfil e ações na empresa atual", icon: UserCog },
        { to: "/app/settings/user-company", title: "Vínculos com empresas", description: "Empresa padrão, desvincular e visão global (super admin)", icon: Share2 },
        { to: "/app/settings/roles", title: "Perfis & Permissões", description: "Defina papéis e o que cada um pode fazer", icon: ShieldCheck },
        { to: "/app/backup", title: "Backup", description: "Exportação e restauração", icon: Database },
        { to: "/app/notificacoes", title: "Notificações", description: "Central de alertas", icon: Bell },
      ]}
    />
  );
}