"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Package, BookOpen } from "lucide-react";
import { MateriaPrima, Receita, criarCiclo } from "@/types";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface IngredienteSelecionado {
  tipo: "materia_prima" | "receita";
  id: string;
  unidade: string; // unidade de uso (MP) ou unidadeRendimento (receita)
  nome: string;
}

interface Props {
  materiasPrimas: MateriaPrima[];
  receitas: Receita[];
  receitaAtualId?: string; // para excluir a própria receita e detectar ciclos
  value: IngredienteSelecionado | null;
  onChange: (sel: IngredienteSelecionado | null) => void;
  excludeIds?: { tipo: "materia_prima" | "receita"; id: string }[];
}

const unidadeRendimentoLabel: Record<string, string> = {
  porcoes: "porção", unidades: "un", kg: "kg", g: "g", L: "L", ml: "ml",
};

export function IngredienteSelector({
  materiasPrimas,
  receitas,
  receitaAtualId,
  value,
  onChange,
  excludeIds = [],
}: Props) {
  const [open, setOpen] = useState(false);

  const excludeMpIds = new Set(
    excludeIds.filter((e) => e.tipo === "materia_prima").map((e) => e.id)
  );
  const excludeRecIds = new Set(
    excludeIds.filter((e) => e.tipo === "receita").map((e) => e.id)
  );

  const mpsDisponiveis = materiasPrimas.filter((mp) => !excludeMpIds.has(mp.id));

  const receitasDisponiveis = receitas.filter((r) => {
    if (r.id === receitaAtualId) return false;
    if (excludeRecIds.has(r.id)) return false;
    if (receitaAtualId && criarCiclo(receitaAtualId, r.id, receitas)) return false;
    return true;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? (
            <span className="flex items-center gap-2">
              {value.tipo === "receita" ? (
                <BookOpen className="w-3 h-3 text-purple-500" />
              ) : (
                <Package className="w-3 h-3 text-blue-500" />
              )}
              {value.nome}
            </span>
          ) : (
            "Selecionar ingrediente…"
          )}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0">
        <Command>
          <CommandInput placeholder="Buscar ingrediente ou preparo…" />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>

            {mpsDisponiveis.length > 0 && (
              <CommandGroup heading="Matérias-Primas">
                {mpsDisponiveis.map((mp) => (
                  <CommandItem
                    key={mp.id}
                    value={`mp-${mp.nome}`}
                    onSelect={() => {
                      onChange({ tipo: "materia_prima", id: mp.id, unidade: mp.unidade, nome: mp.nome });
                      setOpen(false);
                    }}
                  >
                    <Package className="mr-2 h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="flex-1">{mp.nome}</span>
                    <span className="text-xs text-muted-foreground ml-2">{mp.unidade}</span>
                    <Check className={cn("ml-2 h-4 w-4", value?.id === mp.id && value.tipo === "materia_prima" ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {receitasDisponiveis.length > 0 && (
              <>
                {mpsDisponiveis.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Preparos (sub-receitas)">
                  {receitasDisponiveis.map((r) => (
                    <CommandItem
                      key={r.id}
                      value={`rec-${r.nome}`}
                      onSelect={() => {
                        const unidade = unidadeRendimentoLabel[r.unidadeRendimento] ?? r.unidadeRendimento;
                        onChange({ tipo: "receita", id: r.id, unidade, nome: r.nome });
                        setOpen(false);
                      }}
                    >
                      <BookOpen className="mr-2 h-3.5 w-3.5 text-purple-500 shrink-0" />
                      <span className="flex-1">{r.nome}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        por {unidadeRendimentoLabel[r.unidadeRendimento] ?? r.unidadeRendimento}
                      </span>
                      <Check className={cn("ml-2 h-4 w-4", value?.id === r.id && value.tipo === "receita" ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
