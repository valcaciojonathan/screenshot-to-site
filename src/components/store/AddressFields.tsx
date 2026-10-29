import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(30),
  recipient: z.string().trim().min(3, "Informe o destinatário").max(100),
  zip: z.string().trim().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  street: z.string().trim().min(2, "Informe a rua").max(150),
  number: z.string().trim().min(1, "Informe o número").max(10),
  complement: z.string().trim().max(60),
  district: z.string().trim().min(2, "Informe o bairro").max(80),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  state: z.string().trim().length(2, "UF com 2 letras").transform((s) => s.toUpperCase()),
});
export type AddressInput = z.input<typeof addressSchema>;

const FIELDS: { k: keyof AddressInput; l: string; span?: string }[] = [
  { k: "label", l: "Apelido (ex.: Casa)" },
  { k: "recipient", l: "Destinatário" },
  { k: "zip", l: "CEP" },
  { k: "street", l: "Rua", span: "sm:col-span-2" },
  { k: "number", l: "Número" },
  { k: "complement", l: "Complemento" },
  { k: "district", l: "Bairro" },
  { k: "city", l: "Cidade" },
  { k: "state", l: "UF" },
];

export function AddressFields({ value, onChange }: { value: AddressInput; onChange: (v: AddressInput) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {FIELDS.map((f) => (
        <div key={f.k} className={`space-y-1.5 ${f.span ?? ""}`}>
          <Label htmlFor={`addr-${f.k}`}>{f.l}</Label>
          <Input id={`addr-${f.k}`} value={value[f.k] ?? ""} maxLength={f.k === "state" ? 2 : undefined} onChange={(e) => onChange({ ...value, [f.k]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
