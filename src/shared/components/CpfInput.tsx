import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCPF, isValidCPF, onlyDigitsCPF } from "@/shared/utils/cpf";

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Mensagem de erro externa (ex.: duplicidade). */
  error?: string;
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

/**
 * Campo de CPF com formatação automática e validação dos dígitos verificadores.
 * Mostra ícone verde/vermelho e mensagem de status. Reutilizável em todo o sistema.
 */
export function CpfInput({
  value, onChange, error, label = "CPF", id = "cpf", required, className,
}: Props) {
  const digits = onlyDigitsCPF(value);
  const filled = digits.length > 0;
  const complete = digits.length === 11;
  const valid = complete && isValidCPF(digits);
  const invalid = filled && complete && !valid;

  const stateMsg = !filled
    ? (required ? "CPF obrigatório (11 dígitos)." : "Opcional. Se informado, será validado.")
    : !complete
    ? `Digite os 11 dígitos (${digits.length}/11).`
    : valid
    ? "CPF válido."
    : "CPF inválido. Verifique os dígitos.";

  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id}>{label}{required && " *"}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={formatCPF(value)}
          onChange={(e) => onChange(onlyDigitsCPF(e.target.value))}
          aria-invalid={invalid || !!error}
          maxLength={14}
          className={cn(
            "pr-9",
            valid && !error && "border-green-500 focus-visible:ring-green-500",
            (invalid || !!error) && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {valid && !error && (
          <Check className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
        )}
        {(invalid || !!error) && (
          <X className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
        )}
      </div>
      <p className={cn(
        "text-xs",
        valid && !error ? "text-green-600" : (invalid || error) ? "text-destructive" : "text-muted-foreground",
      )}>
        {error ?? stateMsg}
      </p>
    </div>
  );
}