import { Outlet } from "react-router-dom";

/**
 * Layout enxuto: a navegação principal já fica no AppSidebar.
 * Cada página filha cuida do próprio cabeçalho.
 */
export default function SettingsLayout() {
  return (
    <div className="space-y-6">
      <Outlet />
    </div>
  );
}