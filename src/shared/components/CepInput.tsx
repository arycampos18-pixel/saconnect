import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { buscarCep, formatCEP, onlyDigitsCEP, type ViaCepResult } from "@/shared/utils/cep";

interface Props {
  value: string;
  onChange: (cep: string) => void;
  onAddressFound?: (data: {
    rua: string;
    bairro: string;
    cidade: string;
    uf: string;
  }) => void;
  label?: string;
  id?: string;
  className?: string;
}

/**
 * Campo de CEP com integração ViaCEP (Correios).
 * Ao digitar 8 dígitos, busca automaticamente o endereço e dispara onAddressFound.
 */
export function CepInput({
  value,
  onChange,
  onAddressFound,
  label = "CEP",
  id = "cep",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = formatCEP(e.target.value);
    onChange(v);
    if (onlyDigitsCEP(v).length !== 8) return;
    setLoading(true);
    try {
      const data: ViaCepResult | null = await buscarCep(v);
      if (!data) {
        toast.error("CEP não encontrado");
        return;
      }
      onAddressFound?.({
        rua: data.logradouro ?? "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        uf: data.uf ?? "",
      });
      toast.success("Endereço preenchido pelo CEP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={handleChange}
          placeholder="00000-000"
          inputMode="numeric"
          maxLength={9}
          className={loading ? "pr-9" : ""}
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}