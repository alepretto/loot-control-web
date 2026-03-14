"use client";

import { useRef, useState } from "react";
import { Category, Currency, Tag, transactionsApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface Props {
  categories: Category[];
  tags: Tag[];
  onImported: () => void;
  onClose: () => void;
}

interface CsvRow {
  data: string;
  tipo: string;
  categoria: string;
  tag: string;
  valor: string;
  moeda: string;
  quantidade?: string;
  symbol?: string;
  index_rate?: string;
  index?: string;
}

interface ParsedRow {
  line: number;
  tag_id: string;
  date_transaction: string;
  value: number;
  currency: Currency;
  quantity?: number;
  symbol?: string;
  index_rate?: number;
  index?: string;
  error?: string;
}

const FIELD_DOCS: { field: string; required: string; values: string; description: string }[] = [
  {
    field: "data",
    required: "Obrigatório",
    values: "YYYY-MM-DD ou YYYY-MM-DDTHH:MM",
    description: "Data da transação. Exemplo: 2026-01-15 ou 2026-01-15T14:30",
  },
  {
    field: "tipo",
    required: "Obrigatório",
    values: "outcome | income",
    description: "outcome = saída (despesa/investimento). income = entrada (receita/resgate).",
  },
  {
    field: "categoria",
    required: "Obrigatório",
    values: "Texto",
    description: "Nome exato da categoria (sem distinção de maiúsculas).",
  },
  {
    field: "tag",
    required: "Obrigatório",
    values: "Texto",
    description: "Nome exato da tag dentro da categoria informada.",
  },
  {
    field: "valor",
    required: "Obrigatório",
    values: "Número positivo",
    description: "Valor da transação. Use ponto como separador decimal. Exemplo: 1500.00",
  },
  {
    field: "moeda",
    required: "Obrigatório",
    values: "BRL | USD | EUR",
    description: "Moeda da transação.",
  },
  {
    field: "quantidade",
    required: "Investimentos",
    values: "Número",
    description: "Quantidade de ativos. Obrigatório para investimentos. Exemplo: 0.005 (BTC), 100 (ações).",
  },
  {
    field: "symbol",
    required: "Investimentos",
    values: "Texto",
    description: "Ticker/símbolo do ativo. Exemplo: BTC, PETR4, MXRF11.",
  },
  {
    field: "index_rate",
    required: "Renda fixa",
    values: "Número",
    description: "Taxa no momento da transação. Exemplo: 12.5 (para 12,5% ao ano).",
  },
  {
    field: "index",
    required: "Renda fixa",
    values: "Texto",
    description: "Nome do índice de referência. Exemplo: CDI, IPCA, SELIC.",
  },
];

const TEMPLATE_ROWS = [
  ["data", "tipo", "categoria", "tag", "valor", "moeda", "quantidade", "symbol", "index_rate", "index"],
  ["2026-01-15", "outcome", "Alimentação", "Restaurante", "85.50", "BRL", "", "", "", ""],
  ["2026-01-20", "income", "Receitas", "Salário", "8000.00", "BRL", "", "", "", ""],
  ["2026-01-22", "outcome", "Investimentos", "Aporte", "500.00", "USD", "0.005", "BTC", "", ""],
  ["2026-01-25", "outcome", "Investimentos", "Aporte", "1000.00", "BRL", "1", "MXRF11", "11.5", "CDI"],
];

function downloadTemplate() {
  const csv = TEMPLATE_ROWS.map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_transacoes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, ""));
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])) as unknown as CsvRow;
  });
}

export function ImportModal({ categories, tags, onImported, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const csvRows = parseCsv(text);
      const parsed: ParsedRow[] = csvRows.map((row, i) => {
        const lineNum = i + 2;

        const tipo = row.tipo?.toLowerCase().trim();
        if (!tipo || !["outcome", "income"].includes(tipo))
          return { line: lineNum, error: `Campo "tipo" inválido: "${row.tipo}". Use outcome ou income.` } as ParsedRow;

        const cat = categories.find((c) => c.name.toLowerCase() === row.categoria?.toLowerCase());
        if (!cat)
          return { line: lineNum, error: `Categoria "${row.categoria}" não encontrada.` } as ParsedRow;

        const tag = tags.find(
          (t) =>
            t.name.toLowerCase() === row.tag?.toLowerCase() &&
            t.category_id === cat.id &&
            t.type === tipo
        );
        if (!tag) {
          const wrongType = tags.find(
            (t) => t.name.toLowerCase() === row.tag?.toLowerCase() && t.category_id === cat.id
          );
          if (wrongType)
            return {
              line: lineNum,
              error: `Tag "${row.tag}" em "${row.categoria}" é do tipo "${wrongType.type}", mas o CSV informa "${tipo}".`,
            } as ParsedRow;
          return { line: lineNum, error: `Tag "${row.tag}" não encontrada em "${row.categoria}" com tipo "${tipo}".` } as ParsedRow;
        }

        const value = parseFloat(row.valor);
        if (isNaN(value) || value <= 0)
          return { line: lineNum, error: `Valor inválido: "${row.valor}". Use número positivo.` } as ParsedRow;

        const currency = (row.moeda?.toUpperCase().trim() || "BRL") as Currency;
        if (!["BRL", "USD", "EUR"].includes(currency))
          return { line: lineNum, error: `Moeda inválida: "${row.moeda}". Use BRL, USD ou EUR.` } as ParsedRow;

        const date = new Date(row.data);
        if (isNaN(date.getTime()))
          return { line: lineNum, error: `Data inválida: "${row.data}". Use YYYY-MM-DD.` } as ParsedRow;

        return {
          line: lineNum,
          tag_id: tag.id,
          date_transaction: date.toISOString(),
          value,
          currency,
          quantity: row.quantidade ? parseFloat(row.quantidade) || undefined : undefined,
          symbol: row.symbol || undefined,
          index_rate: row.index_rate ? parseFloat(row.index_rate) || undefined : undefined,
          index: row.index || undefined,
        };
      });
      setRows(parsed);
      setDone(false);
      setProgress(0);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    const valid = rows.filter((r) => !r.error);
    if (!valid.length) return;
    setImporting(true);
    setProgress(0);
    let count = 0;
    for (const row of valid) {
      await transactionsApi.create({
        tag_id: row.tag_id,
        date_transaction: row.date_transaction,
        value: row.value,
        currency: row.currency,
        quantity: row.quantity,
        symbol: row.symbol,
        index_rate: row.index_rate,
        index: row.index,
      });
      count++;
      setProgress(Math.round((count / valid.length) * 100));
    }
    setImporting(false);
    setDone(true);
    onImported();
  }

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => r.error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">Importar Transações (CSV)</h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary transition-colors text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Template download */}
          <div className="flex items-center justify-between bg-surface-2 rounded-lg px-4 py-3">
            <div>
              <p className="text-xs font-medium text-text-primary">Baixar modelo CSV</p>
              <p className="text-xs text-muted mt-0.5">
                Inclui exemplos de despesa, receita, cripto e renda fixa
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              ↓ Baixar modelo
            </Button>
          </div>

          {/* Field reference toggle */}
          <div>
            <button
              onClick={() => setShowDocs((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover transition-colors font-medium"
            >
              <span>{showDocs ? "▼" : "▶"}</span>
              {showDocs ? "Ocultar" : "Ver"} referência de campos
            </button>

            {showDocs && (
              <div className="mt-3 border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-2 text-left">
                      <th className="px-3 py-2 font-semibold text-muted uppercase tracking-wider">Campo</th>
                      <th className="px-3 py-2 font-semibold text-muted uppercase tracking-wider">Obrigatoriedade</th>
                      <th className="px-3 py-2 font-semibold text-muted uppercase tracking-wider">Valores aceitos</th>
                      <th className="px-3 py-2 font-semibold text-muted uppercase tracking-wider">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {FIELD_DOCS.map((f) => (
                      <tr key={f.field} className="hover:bg-surface-2">
                        <td className="px-3 py-2 font-mono text-primary whitespace-nowrap">{f.field}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              f.required === "Obrigatório"
                                ? "bg-danger/20 text-danger"
                                : f.required === "Investimentos"
                                ? "bg-primary/20 text-primary"
                                : "bg-surface-3 text-muted"
                            }`}
                          >
                            {f.required}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-accent whitespace-nowrap">{f.values}</td>
                        <td className="px-3 py-2 text-muted">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* File input */}
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              Selecionar arquivo CSV
            </Button>
            {rows.length > 0 && (
              <span className="text-xs text-muted">{rows.length} linha(s) lida(s)</span>
            )}
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-2">
              {errorRows.length > 0 && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium text-danger mb-1">{errorRows.length} erro(s) encontrado(s):</p>
                  {errorRows.map((r) => (
                    <p key={r.line} className="text-xs text-danger/80">
                      Linha {r.line}: {r.error}
                    </p>
                  ))}
                </div>
              )}
              {validRows.length > 0 && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-accent">
                    ✓ {validRows.length} transação(ões) válida(s) e prontas para importar
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-1">
              <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted">Importando… {progress}%</p>
            </div>
          )}

          {done && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
              <p className="text-xs text-accent">
                ✓ Importação concluída: {validRows.length} transação(ões) criadas.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-border shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
          {validRows.length > 0 && !done && (
            <Button size="sm" onClick={runImport} disabled={importing}>
              {importing ? "Importando..." : `Importar ${validRows.length} transações`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
