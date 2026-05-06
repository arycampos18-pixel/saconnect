import { useSyncExternalStore } from "react";
import {
  DEPARTAMENTOS_MOCK, MEMBROS_MOCK, INTERACOES_MOCK, TOTAIS_MOCK,
  type DepartamentoGab, type MembroDep, type InteracaoDep,
} from "./data/mock";

type State = {
  departamentos: DepartamentoGab[];
  membros: MembroDep[];
  interacoes: InteracaoDep[];
  totaisOverride: Record<string, number>;
};

let state: State = {
  departamentos: [...DEPARTAMENTOS_MOCK],
  membros: [...MEMBROS_MOCK],
  interacoes: [...INTERACOES_MOCK],
  totaisOverride: { ...TOTAIS_MOCK },
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const depStore = {
  getState: () => state,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  totalMembros(depId: string) {
    const reais = state.membros.filter((m) => m.departamentoId === depId).length;
    return reais > 0 ? reais : (state.totaisOverride[depId] ?? 0);
  },
  criar(d: Omit<DepartamentoGab, "id" | "criadoEm">) {
    const novo: DepartamentoGab = {
      ...d,
      id: "d" + (Date.now()),
      criadoEm: new Date().toISOString().slice(0, 10),
    };
    state = { ...state, departamentos: [novo, ...state.departamentos] };
    emit();
    return novo;
  },
  atualizar(id: string, patch: Partial<DepartamentoGab>) {
    state = {
      ...state,
      departamentos: state.departamentos.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    };
    emit();
  },
  remover(id: string) {
    state = {
      ...state,
      departamentos: state.departamentos.filter((d) => d.id !== id),
      membros: state.membros.filter((m) => m.departamentoId !== id),
      interacoes: state.interacoes.filter((i) => i.departamentoId !== id),
    };
    emit();
  },
  adicionarMembro(m: Omit<MembroDep, "id" | "entradaEm" | "status"> & { status?: MembroDep["status"] }) {
    const novo: MembroDep = {
      ...m,
      id: "m" + Date.now(),
      entradaEm: new Date().toISOString().slice(0, 10),
      status: m.status ?? "Ativo",
    };
    state = { ...state, membros: [novo, ...state.membros] };
    emit();
    return novo;
  },
  atualizarMembro(id: string, patch: Partial<MembroDep>) {
    state = { ...state, membros: state.membros.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
    emit();
  },
  removerMembro(id: string) {
    state = { ...state, membros: state.membros.filter((m) => m.id !== id) };
    emit();
  },
  registrarInteracao(i: Omit<InteracaoDep, "id">) {
    const novo: InteracaoDep = { ...i, id: "i" + Date.now() };
    state = { ...state, interacoes: [novo, ...state.interacoes] };
    emit();
    return novo;
  },
};

export function useDepStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(depStore.subscribe, () => selector(state), () => selector(state));
}