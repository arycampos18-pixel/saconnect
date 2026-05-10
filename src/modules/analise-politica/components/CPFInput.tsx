import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCPF, isValidCPF, onlyDigits } from "../utils/cpf";

interface CPFInputProps {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label?: string;
  id?: string;
}

export function CPFInput({ value, onChange, error, label = "CPF", id = "cpf" }: CPFInputProps) {
  const digits = onlyDigits(value);
  const filled = digits.length > 0;
  const complete = digits.length === 11;
  const valid = complete && isValidCPF(digits);
  const invalid = filled && complete && !valid;

  const stateMsg = !filled
    ? "Opcional. Se informado, será validado."
    : !complete
      ? `Digite os 11 dígitos (${digits.length}/11).`
      : valid
        ? "CPF válido."
        : "CPF inválido. Verifique os dígitos.";

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={formatCPF(value)}
          onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 11))}
          aria-invalid={invalid || !!error}
          className={cn(
            "pr-9",
            valid && "border-green-500 focus-visible:ring-green-500",
            (invalid || error) && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {valid && (
          <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" aria-label="CPF válido" />
        )}
        {invalid && (
          <X className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" aria-label="CPF inválido" />
        )}
      </div>
      <p
        className={cn(
          "text-xs",
          valid ? "text-green-600" : invalid || error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {error ?? stateMsg}
      </p>
    </div>
  );
}