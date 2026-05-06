import { Handle, Position, type NodeProps } from "reactflow";
import { Bell, GitBranch, MessageCircle, Sparkles, Tag, UserPlus, Zap } from "lucide-react";

const baseClasses =
  "rounded-md border-2 bg-white px-3 py-2 shadow-sm text-xs min-w-[180px] max-w-[220px]";

export function TriggerNode({ data }: NodeProps) {
  return (
    <div className={`${baseClasses} border-sky-500`}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-600">
        <Zap className="h-3 w-3" /> Quando
      </div>
      <div className="font-semibold text-foreground">{data?.label ?? "Trigger"}</div>
      {data?.descricao && (
        <div className="mt-1 text-[11px] text-muted-foreground">{data.descricao}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500" />
    </div>
  );
}

export function CondicaoNode({ data }: NodeProps) {
  return (
    <div className={`${baseClasses} border-amber-400`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-400" />
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
        <GitBranch className="h-3 w-3" /> Se
      </div>
      <div className="font-semibold text-foreground">{data?.label ?? "Condição"}</div>
      {data?.descricao && (
        <div className="mt-1 text-[11px] text-muted-foreground">{data.descricao}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400" />
    </div>
  );
}

export function AcaoNode({ data }: NodeProps) {
  const Icon =
    data?.acaoTipo === "mensagem"
      ? MessageCircle
      : data?.acaoTipo === "tag"
      ? Tag
      : data?.acaoTipo === "notificar"
      ? Bell
      : data?.acaoTipo === "convidar"
      ? UserPlus
      : Sparkles;
  return (
    <div className={`${baseClasses} border-primary`}>
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
        <Icon className="h-3 w-3" /> Então
      </div>
      <div className="font-semibold text-foreground">{data?.label ?? "Ação"}</div>
      {data?.descricao && (
        <div className="mt-1 text-[11px] text-muted-foreground">{data.descricao}</div>
      )}
    </div>
  );
}

export const NODE_TYPES = {
  trigger: TriggerNode,
  condicao: CondicaoNode,
  acao: AcaoNode,
};

export const TRIGGER_PRESETS: { key: string; label: string; descricao: string; tipo: string }[] = [
  { key: "novo_eleitor", label: "Novo eleitor cadastrado", descricao: "Dispara quando alguém é adicionado à base", tipo: "novo_eleitor" },
  { key: "eleitor_respondeu_pesquisa", label: "Eleitor respondeu pesquisa", descricao: "Dispara após resposta de pesquisa", tipo: "eleitor_respondeu_pesquisa" },
  { key: "eleitor_participou_evento", label: "Participou de evento", descricao: "Dispara quando há check-in em evento", tipo: "eleitor_participou_evento" },
  { key: "aniversario_eleitor", label: "Aniversário do eleitor", descricao: "Dispara no dia do aniversário", tipo: "aniversario_eleitor" },
  { key: "data_especifica", label: "Data específica", descricao: "Dispara em uma data agendada", tipo: "data_especifica" },
  { key: "manual", label: "Execução manual", descricao: "Disparada por você no painel", tipo: "manual" },
];

export const CONDICAO_PRESETS: { key: string; label: string; descricao: string }[] = [
  { key: "tem_telefone", label: "Eleitor tem telefone", descricao: "Verifica se há telefone cadastrado" },
  { key: "bairro_igual", label: "Bairro = X", descricao: "Filtra por bairro" },
  { key: "tem_tag", label: "Possui tag X", descricao: "Verifica se tem a tag" },
  { key: "propensao_acima", label: "Propensão > X%", descricao: "Filtra pela propensão de voto" },
];

export const ACAO_PRESETS: { key: string; label: string; descricao: string; acaoTipo: string }[] = [
  { key: "msg_whatsapp", label: "Enviar WhatsApp", descricao: "Mensagem personalizada via wa.me", acaoTipo: "mensagem" },
  { key: "msg_email", label: "Registrar mensagem em massa", descricao: "Cria registro em Comunicação", acaoTipo: "mensagem" },
  { key: "atualizar_tag", label: "Atribuir tag", descricao: "Adiciona tag ao eleitor", acaoTipo: "tag" },
  { key: "convidar_evento", label: "Convidar para evento", descricao: "Inscreve em um evento", acaoTipo: "convidar" },
  { key: "notificar_lideranca", label: "Notificar liderança", descricao: "Cria compromisso na agenda", acaoTipo: "notificar" },
];