import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCompany } from "../contexts/CompanyContext";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export function CompanySwitcher() {
  const { companies, currentCompany, changeCompany, isSuperAdmin, switching } = useCompany();
  const [open, setOpen] = useState(false);
  if (!currentCompany) return null;

  return (
    <Popover open={open && !switching} onOpenChange={(v) => !switching && setOpen(v)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={switching}
          className="h-9 gap-2 max-w-[220px] justify-between"
        >
          {switching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
          )}
          <span className="truncate text-sm">{currentCompany.nome_fantasia}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup>
              {companies.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.nome_fantasia}
                  disabled={switching}
                  onSelect={async () => {
                    if (switching) return;
                    setOpen(false);
                    await changeCompany(c.id);
                  }}
                  className="gap-2"
                >
                  <Check className={`h-4 w-4 ${currentCompany.id === c.id ? "opacity-100" : "opacity-0"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{c.nome_fantasia}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.razao_social}</p>
                  </div>
                  {c.status !== "active" && (
                    <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {isSuperAdmin && (
              <CommandGroup heading="Super Admin">
                <CommandItem onSelect={() => { window.location.href = "/app/settings/companies"; }}>
                  <Building2 className="mr-2 h-4 w-4" /> Gerenciar empresas
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}