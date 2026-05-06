import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cadastrosService } from "../services/cadastrosService";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { auditoriaService, type AuditLog } from "@/modules/auditoria/services/auditoriaService";

export type CadastroTipo = "Usuário" | "Cabo" | "Liderança" | "Organização";
export type CadastroAcao = "ver" | "editar" | "inativar";

type Props = {
  open: boolean;
  onClose: () => void;
  tipo: CadastroTipo | null;
  id: string | null;
  acao: CadastroAcao | null;
  statusAtual: "Ativo" | "Inativo";
  onChanged: () => void;
};

export function CadastroAcoesDialog({ open, onClose, tipo, id, acao, statusAtual, onChanged }: Props) {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [registro, setRegistro] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [historico, setHistorico] = useState<AuditLog[]>([]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open || !tipo || !id) return;
    setLoading(true);
    (async () => {
      try {
        let item: any = null;
        if (tipo === "Liderança") {
          const all = await cadastrosService.listarLiderancas();
          item = all.find((x) => x.id === id);
        } else if (tipo === "Cabo") {
          const all = await cadastrosService.listarCabos();
          item = all.find((x) => x.id === id);
        } else if (tipo === "Organização") {
          const all = await cadastrosService.listarOrganizacoes();
          item = all.find((x) => x.id === id);
        } else if (tipo === "Usuário") {
          const all = await cadastrosService.listarUsuarios();
          item = all.find((x: any) => x.id === id);
        }
        setRegistro(item);
        setForm(item ? { ...item } : {});
        try {
          const logs = await auditoriaService.listar({ entidade: tipo!, limit: 50 });
          setHistorico(logs.filter((l) => l.entidade_id === id));
        } catch {
          setHistorico([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, tipo, id]);

  async function salvar() {
    if (!tipo || !id) return;
    if (!isAdmin) {
      toast.error("Apenas administradores podem editar cadastros.");
      return;
    }
    setLoading(true);
    try {
      const anterior = registro ? { ...registro } : null;
      let novo: any = null;
      if (tipo === "Usuário") {
        novo = await cadastrosService.atualizarUsuario(id, {
          nome: form.nome,
          telefone: form.telefone || null,
          cargo: form.cargo || null,
          ativo: !!form.ativo,
        });
      } else if (tipo === "Liderança") {
        novo = await cadastrosService.atualizarLideranca(id, {
          nome: form.nome,
          telefone: form.telefone || null,
          cidade: form.cidade || null,
          meta: Number(form.meta) || 0,
          ativo: !!form.ativo,
        });
      } else if (tipo === "Cabo") {
        novo = await cadastrosService.atualizarCabo(id, {
          nome: form.nome,
          telefone: form.telefone || null,
          meta: Number(form.meta) || 0,
          ativo: !!form.ativo,
        });
      } else if (tipo === "Organização") {
        novo = await cadastrosService.atualizarOrganizacao(id, {
          nome: form.nome,
          tipo: form.tipo || "Gabinete",
          cidade: form.cidade || null,
          uf: form.uf || null,
          observacoes: form.observacoes || null,
          ativo: !!form.ativo,
        });
      }
      const diff = computarDiff(anterior, novo);
      await auditoriaService.registrar({
        acao: "Editar",
        entidade: tipo!,
        entidade_id: id,
        modulo: "Cadastros",
        descricao: `${tipo} "${anterior?.nome ?? id}" atualizado(a). Campos: ${Object.keys(diff).join(", ") || "nenhum"}`,
        dados_anteriores: pickRelevant(anterior, diff),
        dados_novos: pickRelevant(novo, diff),
      });
      toast.success("Cadastro atualizado.");
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtivo() {
    if (!tipo || !id) return;
    if (!isAdmin) {
      toast.error("Apenas administradores podem inativar/reativar cadastros.");
      return;
    }
    setLoading(true);
    try {
      const novoAtivo = statusAtual !== "Ativo";
      const patch: any = { ativo: novoAtivo };
      if (tipo === "Usuário") await cadastrosService.atualizarUsuario(id, patch);
      else if (tipo === "Liderança") await cadastrosService.atualizarLideranca(id, patch);
      else if (tipo === "Cabo") await cadastrosService.atualizarCabo(id, patch);
      else if (tipo === "Organização") await cadastrosService.atualizarOrganizacao(id, patch);
      await auditoriaService.registrar({
        acao: "Editar",
        entidade: tipo!,
        entidade_id: id,
        modulo: "Cadastros",
        descricao: `${tipo} "${registro?.nome ?? id}" ${novoAtivo ? "reativado(a)" : "inativado(a)"}.`,
        dados_anteriores: { ativo: !novoAtivo },
        dados_novos: { ativo: novoAtivo },
      });
      toast.success(novoAtivo ? "Cadastro reativado." : "Cadastro inativado.");
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar status.");
    } finally {
      setLoading(false);
    }
  }

  const titulos: Record<CadastroAcao, string> = {
    ver: "Visualizar cadastro",
    editar: "Editar cadastro",
    inativar: statusAtual === "Ativo" ? "Inativar cadastro" : "Reativar cadastro",
  };

  const readOnly = acao === "ver";

  function renderCampos() {
    if (!registro) return null;
    if (tipo === "Usuário") {
      return (
        <>
          <Secao titulo="Dados pessoais">
            <Campo label="Nome">
              <Input value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} />
            </Campo>
            <Campo label="E-mail (somente leitura)">
              <Input value={form.email ?? ""} disabled />
            </Campo>
            <Campo label="Telefone">
              <Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} disabled={readOnly} />
            </Campo>
          </Secao>
          <Secao titulo="Informações do sistema">
            <Campo label="Cargo">
              <Input value={form.cargo ?? ""} onChange={(e) => set("cargo", e.target.value)} disabled={readOnly} />
            </Campo>
            <Campo label="Perfil(s)">
              <Input value={(registro.roles ?? []).join(", ") || "—"} disabled />
            </Campo>
            <CampoStatus form={form} set={set} disabled={readOnly} />
            <CampoCriadoEm value={registro.created_at} />
          </Secao>
        </>
      );
    }
    if (tipo === "Liderança") {
      return (
        <>
          <Secao titulo="Dados pessoais">
            <Campo label="Nome"><Input value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} /></Campo>
            <Campo label="Telefone"><Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} disabled={readOnly} /></Campo>
          </Secao>
          <Secao titulo="Dados políticos">
            <Campo label="Cidade"><Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} disabled={readOnly} /></Campo>
            <Campo label="Meta de eleitores">
              <Input type="number" value={form.meta ?? 0} onChange={(e) => set("meta", e.target.value)} disabled={readOnly} />
            </Campo>
            <Campo label="Organização (ID)"><Input value={form.organizacao_id ?? ""} disabled /></Campo>
            <Campo label="Liderança superior (ID)"><Input value={form.superior_id ?? ""} disabled /></Campo>
          </Secao>
          <Secao titulo="Informações do sistema">
            <CampoStatus form={form} set={set} disabled={readOnly} />
            <CampoCriadoEm value={registro.created_at} />
          </Secao>
        </>
      );
    }
    if (tipo === "Cabo") {
      return (
        <>
          <Secao titulo="Dados pessoais">
            <Campo label="Nome"><Input value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} /></Campo>
            <Campo label="Telefone"><Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} disabled={readOnly} /></Campo>
          </Secao>
          <Secao titulo="Dados políticos">
            <Campo label="Meta de eleitores">
              <Input type="number" value={form.meta ?? 0} onChange={(e) => set("meta", e.target.value)} disabled={readOnly} />
            </Campo>
            <Campo label="Liderança vinculada (ID)"><Input value={form.lideranca_id ?? ""} disabled /></Campo>
          </Secao>
          <Secao titulo="Informações do sistema">
            <CampoStatus form={form} set={set} disabled={readOnly} />
            <CampoCriadoEm value={registro.created_at} />
          </Secao>
        </>
      );
    }
    if (tipo === "Organização") {
      return (
        <>
          <Secao titulo="Dados da organização">
            <Campo label="Nome"><Input value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} disabled={readOnly} /></Campo>
            <Campo label="Tipo"><Input value={form.tipo ?? ""} onChange={(e) => set("tipo", e.target.value)} disabled={readOnly} /></Campo>
          </Secao>
          <Secao titulo="Localização">
            <Campo label="Cidade"><Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} disabled={readOnly} /></Campo>
            <Campo label="UF"><Input value={form.uf ?? ""} maxLength={2} onChange={(e) => set("uf", e.target.value.toUpperCase())} disabled={readOnly} /></Campo>
          </Secao>
          <Secao titulo="Observações">
            <Campo label="Anotações">
              <Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} disabled={readOnly} />
            </Campo>
          </Secao>
          <Secao titulo="Informações do sistema">
            <CampoStatus form={form} set={set} disabled={readOnly} />
            <CampoCriadoEm value={registro.created_at} />
          </Secao>
        </>
      );
    }
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{acao ? titulos[acao] : ""}</DialogTitle>
          <DialogDescription>
            {tipo} · {registro?.nome ?? "—"}
          </DialogDescription>
        </DialogHeader>

        {loading && !registro ? (
          <p className="py-6 text-sm text-muted-foreground">Carregando…</p>
        ) : !registro ? (
          <p className="py-6 text-sm text-muted-foreground">Registro não encontrado.</p>
        ) : acao === "inativar" ? (
          <p className="py-2 text-sm">
            Tem certeza que deseja{" "}
            <strong>{statusAtual === "Ativo" ? "inativar" : "reativar"}</strong> este cadastro?
            {statusAtual === "Ativo" && " Ele ficará oculto das operações até ser reativado."}
          </p>
        ) : (
          <div className="space-y-5 py-2">{renderCampos()}</div>
        )}

        {registro && acao !== "inativar" && (
          <HistoricoAlteracoes logs={historico} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {acao === "editar" && (
            <Button onClick={salvar} disabled={loading || !isAdmin}>
              {loading ? "Salvando…" : "Salvar"}
            </Button>
          )}
          {acao === "inativar" && (
            <Button
              variant={statusAtual === "Ativo" ? "destructive" : "default"}
              onClick={toggleAtivo}
              disabled={loading || !isAdmin}
            >
              {statusAtual === "Ativo" ? "Inativar" : "Reativar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-foreground">{titulo}</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CampoStatus({ form, set, disabled }: { form: any; set: (k: string, v: any) => void; disabled?: boolean }) {
  return (
    <Campo label="Status">
      <div className="flex h-10 items-center gap-3 rounded-md border border-input px-3">
        <Switch checked={!!form.ativo} onCheckedChange={(v) => set("ativo", v)} disabled={disabled} />
        <span className="text-sm">{form.ativo ? "Ativo" : "Inativo"}</span>
      </div>
    </Campo>
  );
}

function CampoCriadoEm({ value }: { value?: string }) {
  return (
    <Campo label="Cadastrado em">
      <Input value={value ? new Date(value).toLocaleString("pt-BR") : "—"} disabled />
    </Campo>
  );
}

const CAMPOS_RASTREADOS = [
  "nome", "telefone", "cargo", "ativo", "cidade", "uf", "meta", "tipo", "observacoes",
];

function computarDiff(antes: any, depois: any): Record<string, { de: any; para: any }> {
  const diff: Record<string, { de: any; para: any }> = {};
  if (!antes || !depois) return diff;
  for (const k of CAMPOS_RASTREADOS) {
    const a = antes[k] ?? null;
    const b = depois[k] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) diff[k] = { de: a, para: b };
  }
  return diff;
}

function pickRelevant(obj: any, diff: Record<string, any>) {
  if (!obj) return null;
  const out: any = {};
  for (const k of Object.keys(diff)) out[k] = obj[k] ?? null;
  return out;
}

function HistoricoAlteracoes({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-foreground">Histórico de alterações</h4>
      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma alteração registrada.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {logs.map((l) => (
            <li key={l.id} className="rounded-md border border-border/40 bg-background/60 p-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{l.user_nome ?? l.user_email ?? "Sistema"}</span>
                <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
              </div>
              <div className="text-muted-foreground">{l.descricao}</div>
              {l.dados_anteriores && l.dados_novos && (
                <div className="mt-1 space-y-0.5">
                  {Object.keys(l.dados_novos).map((k) => (
                    <div key={k}>
                      <span className="font-medium">{k}:</span>{" "}
                      <span className="line-through text-muted-foreground">{String(l.dados_anteriores?.[k] ?? "—")}</span>
                      {" → "}
                      <span>{String(l.dados_novos?.[k] ?? "—")}</span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
