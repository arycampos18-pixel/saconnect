import { z } from "zod";
import { isValidCPF, onlyDigits } from "../utils/cpf";

export const eleitorSchema = z.object({
  nome: z.string().trim().min(3, "Nome obrigatório").max(120),
  cpf: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? onlyDigits(v) : ""))
    .refine((v) => v === "" || isValidCPF(v), { message: "CPF inválido" }),
  telefone_original: z
    .string()
    .trim()
    .min(10, "Telefone obrigatório (mínimo 10 dígitos)")
    .transform((v) => onlyDigits(v))
    .refine((v) => v.length >= 10 && v.length <= 13, { message: "Telefone inválido" }),
  data_nascimento: z.string().optional().or(z.literal("")),
  nome_mae: z.string().trim().max(120).optional().or(z.literal("")),
  titulo_eleitoral: z.string().trim().max(20).optional().or(z.literal("")),
  zona_eleitoral: z.string().trim().max(10).optional().or(z.literal("")),
  secao_eleitoral: z.string().trim().max(10).optional().or(z.literal("")),
  local_votacao: z.string().trim().max(200).optional().or(z.literal("")),
  municipio_eleitoral: z.string().trim().max(120).optional().or(z.literal("")),
  uf_eleitoral: z.string().trim().max(2).optional().or(z.literal("")),
  aceite_lgpd: z.boolean().default(false),
  lideranca_id: z.string().uuid().optional().or(z.literal("")),
});

export type EleitorFormValues = z.infer<typeof eleitorSchema>;