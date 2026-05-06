import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUserRole, type AppRole } from "@/modules/auth/hooks/useUserRole";
import { useSessionValidity } from "@/modules/auth/hooks/useSessionValidity";

type Props = {
  children: React.ReactNode;
  /** Se informado, apenas usuários com um destes papéis podem acessar */
  allowedRoles?: AppRole[];
};

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { session, profile, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const { valid } = useSessionValidity(session);

  if (loading || (session && allowedRoles && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session || !valid) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profile?.ativo === false) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/app" replace />;
    }
  }

  return <>{children}</>;
}