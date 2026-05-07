import { Navigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { isSessionValid } from "@/modules/auth/hooks/useSessionValidity";
import { authLog } from "@/modules/auth/utils/authLogger";

type Props = {
  children: React.ReactNode;
};

export function PublicRoute({ children }: Props) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

   const isActuallyAuthenticated = session && isSessionValid(session) && profile !== null && profile.ativo !== false;

   if (isActuallyAuthenticated) {
    authLog("info", "public_route.redirect_to_app", { userId: session.user?.id });
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}