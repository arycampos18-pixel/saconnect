import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  type DepartamentoGab, type MembroDep, type InteracaoDep,
} from "./data/mock";
import { departamentosService } from "./services/departamentosService";

type State = {
  loaded: boolean;
  loading: boolean;
  departamentos: DepartamentoGab[];
  membros: MembroDep[];
  interacoes: InteracaoDep[];
};

let state: State = {
  loaded: false,
  loading: false,
  departamentos: [],
  membros: [],
  interacoes: [],
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); };

let loadPromise: Promise<void> | null = null;

async function carregar() {
  if (loadPromise) return loadPromise;
  set({ loading: true });
  loadPromise = (async () => {
    try {
      const [departamentos, membros, interacoes] = await Promise.all([
        departamentosService.listarDepartamentos(),
        departamentosService.listarMembros(),
        departamentosService.listarInteracoes(),
      ]);
      set({ departamentos, membros, interacoes, loaded: true, loading: false });
    } catch (e: any) {
      console.error("[depStore] carregar falhou", e);
      toast.error("Erro ao carregar departamentos: " + (e?.message ?? ""));
      set({ loading: false, loaded: true });
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

export const depStore = {
  getState: () => state,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    if (!state.loaded && !state.loading) carregar();
    return () => listeners.delete(cb);
  },
  recarregar: () => carregar(),
  totalMembros(depId: string) {
    return state.membros.filter((m) => m.departamentoId === depId).length;
  },
  async criar(d: Omit<DepartamentoGab, "id" | "criadoEm">) {
    try {
      const novo = await departamentosService.criarDepartamento(d);
      set({ departamentos: [novo, ...state.departamentos] });
      return novo;
    } catch (e: any) {
      toast.error("Erro ao criar: " + (e?.message ?? "")); throw e;
    }
  },
  async atualizar(id: string, patch: Partial<DepartamentoGab>) {
    try {
      await departamentosService.atualizarDepartamento(id, patch);
      set({ departamentos: state.departamentos.map((d) => d.id === id ? { ...d, ...patch } : d) });
    } catch (e: any) { toast.error("Erro ao atualizar: " + (e?.message ?? "")); throw e; }
  },
  async remover(id: string) {
    try {
      await departamentosService.removerDepartamento(id);
      set({
        departamentos: state.departamentos.filter((d) => d.id !== id),
        membros: state.membros.filter((m) => m.departamentoId !== id),
        interacoes: state.interacoes.filter((i) => i.departamentoId !== id),
      });
    } catch (e: any) { toast.error("Erro ao remover: " + (e?.message ?? "")); throw e; }
  },
  async adicionarMembro(m: Omit<MembroDep, "id" | "entradaEm" | "status"> & { status?: MembroDep["status"]; eleitorId?: string | null; }) {
    try {
      const novo = await departamentosService.adicionarMembro(m);
      set({ membros: [novo, ...state.membros] });
      return novo;
    } catch (e: any) { toast.error("Erro ao adicionar membro: " + (e?.message ?? "")); throw e; }
  },
  async atualizarMembro(id: string, patch: Partial<MembroDep>) {
    try {
      await departamentosService.atualizarMembro(id, patch);
      set({ membros: state.membros.map((m) => m.id === id ? { ...m, ...patch } : m) });
    } catch (e: any) { toast.error("Erro ao atualizar membro: " + (e?.message ?? "")); throw e; }
  },
  async removerMembro(id: string) {
    try {
      await departamentosService.removerMembro(id);
      set({ membros: state.membros.filter((m) => m.id !== id) });
    } catch (e: any) { toast.error("Erro ao remover membro: " + (e?.message ?? "")); throw e; }
  },
  async registrarInteracao(i: Omit<InteracaoDep, "id">) {
    try {
      const novo = await departamentosService.registrarInteracao(i);
      set({ interacoes: [novo, ...state.interacoes] });
      return novo;
    } catch (e: any) { toast.error("Erro ao registrar interação: " + (e?.message ?? "")); throw e; }
  },
};

export function useDepStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(depStore.subscribe, () => selector(state), () => selector(state));
}
