import { Navigate, useLocation } from "react-router-dom";

/** Redireciona `/app/wa/*` → `/app/whatsapp/*` (URL canônica do módulo). */
export default function WaLegacyRedirect() {
  const { pathname } = useLocation();
  const tail = pathname.replace(/^\/app\/wa\/?/, "").replace(/^\//, "") || "dashboard";
  return <Navigate to={`/app/whatsapp/${tail}`} replace />;
}
