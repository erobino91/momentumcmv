"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { MateriaPrima, UnidadeMedida } from "@/types";
import { useConfiguracaoStore } from "@/store/configuracoes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormValues = {
  nome: string;
  categoria: string;
  unidade: UnidadeMedida;
  // custo direto
  custoUnitario: string;
  // embalagem
  embalagemDescricao: string;
  embalagemQtd: string;
  embalagemCusto: string;
  // outros
  fatorCorrecao: string;
  fornecedor: string;
  observacao: string;
};

const unidades: { value: UnidadeMedida; label: string }[] = [
  { value: "kg", label: "kg — Quilograma" },
  { value: "g", label: "g — Grama" },
  { value: "L", label: "L — Litro" },
  { value: "ml", label: "ml — Mililitro" },
  { value: "un", label: "un — Unidade" },
  { value: "cx", label: "cx — Caixa" },
  { value: "dz", label: "dz — Dúzia" },
  { value: "pct", label: "pct — Pacote" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (values: Omit<MateriaPrima, "id" | "criadoEm" | "atualizadoEm">) => void;
  initial?: MateriaPrima | null;
}

export function MateriaPrimaFormDialog({ open, onClose, onSave, initial }: Props) {
  const [usaEmbalagem, setUsaEmbalagem] = useState(false);
  const categoriasInsumo = useConfiguracaoStore((s) => s.categoriasInsumo);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      nome: "", categoria: "", unidade: "kg",
      custoUnitario: "", fatorCorrecao: "1",
      embalagemDescricao: "", embalagemQtd: "", embalagemCusto: "",
      fornecedor: "", observacao: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (initial) {
        const hasEmb = !!initial.embalagem;
        setUsaEmbalagem(hasEmb);
        reset({
          nome: initial.nome,
          categoria: initial.categoria,
          unidade: initial.unidade,
          custoUnitario: hasEmb ? "" : initial.custoUnitario.toString(),
          fatorCorrecao: initial.fatorCorrecao.toString(),
          embalagemDescricao: initial.embalagem?.descricao ?? "",
          embalagemQtd: initial.embalagem?.qtd.toString() ?? "",
          embalagemCusto: initial.embalagem?.custo.toString() ?? "",
          fornecedor: initial.fornecedor ?? "",
          observacao: initial.observacao ?? "",
        });
      } else {
        setUsaEmbalagem(false);
        reset({
          nome: "", categoria: "", unidade: "kg",
          custoUnitario: "", fatorCorrecao: "1",
          embalagemDescricao: "", embalagemQtd: "", embalagemCusto: "",
          fornecedor: "", observacao: "",
        });
      }
    }
  }, [initial, open, reset]);

  function onSubmit(data: FormValues) {
    const fc = parseFloat(data.fatorCorrecao);

    let custoUnitario: number;
    let embalagem: MateriaPrima["embalagem"];

    if (usaEmbalagem) {
      const qtd = parseFloat(data.embalagemQtd);
      const custo = parseFloat(data.embalagemCusto);
      embalagem = { descricao: data.embalagemDescricao.trim(), qtd, custo };
      custoUnitario = custo / qtd;
    } else {
      custoUnitario = parseFloat(data.custoUnitario);
    }

    onSave({
      nome: data.nome.trim(),
      categoria: data.categoria,
      unidade: data.unidade,
      custoUnitario,
      fatorCorrecao: fc,
      embalagem,
      fornecedor: data.fornecedor.trim() || undefined,
      observacao: data.observacao.trim() || undefined,
    });
    onClose();
  }

  const unidadeValue = watch("unidade");
  const categoriaValue = watch("categoria");
  const fcValue = watch("fatorCorrecao");
  const embQtd = watch("embalagemQtd");
  const embCusto = watch("embalagemCusto");
  const custoDir = watch("custoUnitario");

  const fcNum = parseFloat(fcValue) || 1;
  const fcPercent = Math.round(fcNum * 100);

  // custo por unidade de uso para o hint
  const custoBase = usaEmbalagem
    ? (parseFloat(embCusto) || 0) / (parseFloat(embQtd) || 1)
    : parseFloat(custoDir) || 0;

  const custoLiquidoHint = fcNum < 1 && custoBase > 0
    ? (custoBase / fcNum).toFixed(4)
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Matéria-Prima" : "Nova Matéria-Prima"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">

          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" placeholder="Ex: Catupiry original" {...register("nome", { required: "Nome obrigatório" })} />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          {/* Categoria + Unidade de uso */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={categoriaValue} onValueChange={(v) => setValue("categoria", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {categoriasInsumo.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unidade de uso *</Label>
              <Select value={unidadeValue} onValueChange={(v) => setValue("unidade", v as UnidadeMedida)}>
                <SelectTrigger><SelectValue>{unidades.find(u => u.value === unidadeValue)?.label}</SelectValue></SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggle embalagem */}
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              onClick={() => setUsaEmbalagem(!usaEmbalagem)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${usaEmbalagem ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${usaEmbalagem ? "translate-x-4" : "translate-x-1"}`} />
            </button>
            <Label className="cursor-pointer font-normal" onClick={() => setUsaEmbalagem(!usaEmbalagem)}>
              Comprado por embalagem (qtd ≠ unidade de uso)
            </Label>
          </div>

          {/* Custo direto OU embalagem */}
          {!usaEmbalagem ? (
            <div className="space-y-1.5">
              <Label>Custo por {unidadeValue} (R$) *</Label>
              <CurrencyInput
                prefix="R$"
                value={parseFloat(custoDir) || 0}
                onChange={(v) => setValue("custoUnitario", v.toString())}
              />
              {errors.custoUnitario && <p className="text-xs text-destructive">{errors.custoUnitario.message}</p>}
            </div>
          ) : (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Embalagem de compra</p>
              <div className="space-y-1.5">
                <Label htmlFor="embDesc">Descrição da embalagem *</Label>
                <Input
                  id="embDesc" placeholder='Ex: "bag 1,5 kg", "cx com 6 un"'
                  {...register("embalagemDescricao", { required: usaEmbalagem && "Descrição obrigatória" })}
                />
                {errors.embalagemDescricao && <p className="text-xs text-destructive">{errors.embalagemDescricao.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="embQtd">Qtd em {unidadeValue} por embalagem *</Label>
                  <Input
                    id="embQtd" type="number" step="0.001" min="0.001" placeholder="Ex: 1500"
                    {...register("embalagemQtd", { required: usaEmbalagem && "Obrigatório", min: { value: 0.001, message: "Deve ser > 0" } })}
                  />
                  {errors.embalagemQtd && <p className="text-xs text-destructive">{errors.embalagemQtd.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Custo da embalagem (R$) *</Label>
                  <CurrencyInput
                    prefix="R$"
                    value={parseFloat(embCusto) || 0}
                    onChange={(v) => setValue("embalagemCusto", v.toString())}
                  />
                  {errors.embalagemCusto && <p className="text-xs text-destructive">{errors.embalagemCusto.message}</p>}
                </div>
              </div>
              {embQtd && embCusto && parseFloat(embQtd) > 0 && parseFloat(embCusto) > 0 && (
                <p className="text-xs text-muted-foreground bg-background rounded px-3 py-2">
                  Custo por {unidadeValue}: <strong>R$ {(parseFloat(embCusto) / parseFloat(embQtd)).toFixed(4)}</strong>
                </p>
              )}
            </div>
          )}

          {/* Fator de Correção */}
          <div className="space-y-1.5">
            <Label htmlFor="fc">
              Fator de Correção
              <span className="ml-1 text-muted-foreground text-xs">({fcPercent}% aproveitamento)</span>
            </Label>
            <Input
              id="fc" type="number" step="0.01" min="0.01" max="1" placeholder="1.00"
              {...register("fatorCorrecao", { required: true, min: { value: 0.01, message: "Mín. 0.01" }, max: { value: 1, message: "Máx. 1.00" } })}
            />
            {errors.fatorCorrecao && <p className="text-xs text-destructive">{errors.fatorCorrecao.message}</p>}
          </div>

          {/* Hint custo líquido */}
          {custoLiquidoHint && (
            <p className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">
              Com FC {fcValue}, custo real por {unidadeValue} líquido ≈ <strong>R$ {custoLiquidoHint}</strong>
            </p>
          )}

          {/* Fornecedor */}
          <div className="space-y-1.5">
            <Label htmlFor="fornecedor">Fornecedor <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input id="fornecedor" placeholder="Ex: Distribuidora XYZ" {...register("fornecedor")} />
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observação <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input id="obs" placeholder="Ex: Manter refrigerado" {...register("observacao")} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{initial ? "Salvar alterações" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
