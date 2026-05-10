import { useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { usePermissoes, type CampoCadastro } from "@/shared/hooks/usePermissoes";
import { ModalNovoCadastro } from "./ModalNovoCadastro";
import type { ItemCriado } from "@/shared/services/catalogosCriacaoService";

export interface DropdownOpcao {
  id: string;
  nome: string;
}

type Props = {
  campo: CampoCadastro;
  /** Rótulo curto usado no botão "+ Novo {label}" */
  label: string;
  opcoes: DropdownOpcao[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholder?: string;
  /** Texto do item neutro (ex: "— Sem responsável —"). Se omitido, não exibe item neutro. */
  emptyOptionLabel?: string;
  /** Para `cabos`: liderança superior obrigatória ao criar */
  liderancaIdParaCabo?: string | null;
  /** Chamado depois de criar — útil para refetch da lista no pai */
  onCreated?: (item: ItemCriado) => void;
  disabled?: boolean;
};

const NEW_TOKEN = "__novo__";
const NULL_TOKEN = "__nenhum__";

export function DropdownComNovoCadastro({
  campo, label, opcoes, value, onChange, placeholder, emptyOptionLabel,
  liderancaIdParaCabo, onCreated, disabled,
}: Props) {
  const { can } = usePermissoes();
  const [modalOpen, setModalOpen] = useState(false);

  const handleChange = (v: string) => {
    if (v === NEW_TOKEN) { setModalOpen(true); return; }
    if (v === NULL_TOKEN) { onChange(null); return; }
    onChange(v);
  };

  const handleCreated = (item: ItemCriado) => {
    onChange(item.id);
    onCreated?.(item);
  };

  const podeCriar = can(campo);
  const tituloSemPermissao = `Você não tem permissão para criar ${label.toLowerCase()}. Solicite ao administrador.`;
  const selectedValue = value ?? (emptyOptionLabel ? NULL_TOKEN : undefined);

  return (
    <>
      <Select value={selectedValue} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger><SelectValue placeholder={placeholder ?? "Selecionar..."} /></SelectTrigger>
        <SelectContent>
          {emptyOptionLabel && <SelectItem value={NULL_TOKEN}>{emptyOptionLabel}</SelectItem>}
          {opcoes.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
          ))}
          <SelectSeparator />
          {podeCriar ? (
            <SelectItem value={NEW_TOKEN} className="text-primary font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Novo {label}
              </span>
            </SelectItem>
          ) : (
            <div
              title={tituloSemPermissao}
              className="relative flex w-full cursor-not-allowed select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-muted-foreground opacity-60"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Novo {label}
              </span>
              <span className="ml-auto text-[10px] uppercase tracking-wide">sem permissão</span>
            </div>
          )}
        </SelectContent>
      </Select>

      <ModalNovoCadastro
        open={modalOpen}
        onOpenChange={setModalOpen}
        campo={campo}
        liderancaIdParaCabo={liderancaIdParaCabo}
        onCreated={handleCreated}
      />
    </>
  );
}