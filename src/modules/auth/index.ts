/**
 * Módulo: Auth
 * API pública: hooks de sessão/papel/permissões e serviço de auth.
 * Outros módulos NÃO devem importar de auth/components ou auth/pages.
 */
export { useAuth, AuthProvider } from "./hooks/useAuth";
export { useUserRole } from "./hooks/useUserRole";
export { useModulosPermitidos } from "./hooks/useModulosPermitidos";
export * as authService from "./services/authService";
