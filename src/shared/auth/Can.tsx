import type { ReactNode } from "react";
import { useCan } from "./useCan";

type Props = {
  permission: string;
  children: ReactNode;
  /** Se passado, é renderizado quando o usuário NÃO tem permissão. */
  fallback?: ReactNode;
};

/** Renderiza children somente se o usuário tem a permissão. */
export function Can({ permission, children, fallback = null }: Props) {
  const { can } = useCan();
  return <>{can(permission) ? children : fallback}</>;
}
