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

const TEMPLATE_HEADERS = [
  "data",
  "categoria",
  "tag",
  "valor",
  "moeda",
  "quantidade",
  "symbol",
  "index_rate",
  "index",
];

const TEMPLATE_EXAMPLE = [
  "2026-01-15",
  "Alimentação",
  "Restaurante",
  "50.00",
  "BRL",
  "",
  "",
  "",
  "",
];

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_EXAMPLE.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])) as CsvRow;
  });
}

export function ImportModal({ categories, tags, onImported, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const csvRows = parseCsv(text);
      const parsed: ParsedRow[] = csvRows.map((row, i) => {
        const lineNum = i + 2;

        const cat = categories.find(
          (c) => c.name.toLowerCase() === row.categoria?.toLowerCase()
        );
        if (!cat) return { line: lineNum, error: `Categoria "${row.categoria}" não encontrada` } as ParsedRow;

        const tag = tags.find(
          (t) =>
            t.name.toLowerCase() === row.tag?.toLowerCase() &&
            t.category_id === cat.id
        );
        if (!tag) return { line: lineNum, error: `Tag "${row.tag}" não encontrada em "${row.categoria}"` } as ParsedRow;

        const value = parseFloat(row.valor);
        if (isNaN(value)) return { line: lineNum, error: `Valor inválido: "${row.valor}"` } as ParsedRow;

        const currency = (row.moeda?.toUpperCase() || "BRL") as Currency;
        if (!["BRL", "USD", "EUR"].includes(currency))
          return { line: lineNum, error: `Moeda inválida: "${row.moeda}"` } as ParsedRow;

        const date = new Date(row.data);
        if (isNaN(date.getTime()))
          return { line: lineNum, error: `Data inválida: "${row.data}"` } as ParsedRow;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl w-full max-w-lg mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Importar Transações</h2>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Template download */}
        <div className="flex items-center justify-between bg-[#252840] rounded-lg px-4 py-3">
          <div>
            <p className="text-xs font-medium text-white">Baixar modelo CSV</p>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Colunas: data, categoria, tag, valor, moeda, quantidade, symbol, index_rate, index
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            Baixar
          </Button>
        </div>

        {/* File input */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
          />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            Selecionar arquivo CSV
          </Button>
          {rows.length > 0 && (
            <span className="ml-3 text-xs text-[#6b7280]">
              {rows.length} linha(s) lida(s)
            </span>
          )}
        </div>

        {/* Preview */}
        {rows.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {errorRows.length > 0 && (
              <div className="space-y-1">
                {errorRows.map((r) => (
                  <p key={r.line} className="text-xs text-[#ef4444]">
                    Linha {r.line}: {r.error}
                  </p>
                ))}
              </div>
            )}
            {validRows.length > 0 && (
              <p className="text-xs text-[#10b981]">
                {validRows.length} transação(ões) prontas para importar
              </p>
            )}
          </div>
        )}

        {/* Progress bar */}
        {importing && (
          <div className="space-y-1">
            <div className="h-1.5 bg-[#252840] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6366f1] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[#6b7280]">{progress}%</p>
          </div>
        )}

        {done && (
          <p className="text-xs text-[#10b981]">
            Importação concluída: {validRows.length} transação(ões) criadas.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
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
