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
        { to: "/app/settings/users", title: "Usuários", description: "Cadastro e acessos", icon: UserCog },
        { to: "/app/settings/profiles", title: "Perfis & RBAC", description: "Permissões granulares", icon: ShieldCheck },
        { to: "/app/auditoria", title: "Auditoria", description: "Logs de atividades", icon: Activity },
        { to: "/app/integracoes", title: "Integrações", description: "Z-API, Meta, Google, etc.", icon: Share2 },
        { to: "/app/webhooks", title: "Webhooks", description: "Eventos enviados ao seu sistema", icon: Webhook },
        { to: "/app/backup", title: "Backup", description: "Exportação e restauração", icon: Database },
        { to: "/app/notificacoes", title: "Notificações", description: "Central de alertas", icon: Bell },
        { to: "/app/configuracoes", title: "Configurações Gerais", description: "Preferências do gabinete", icon: Settings },
      ]}
    />
  );
}