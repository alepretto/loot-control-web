"use client";

import { useEffect, useState } from "react";
import { adminApi, usersApi, type JobStatus, type HistoricalLoadResult } from "@/lib/api";
import { useRouter } from "next/navigation";

type RunResult = { status: "success" | "error"; message: string };

function today() {
  return new Date().toISOString().split("T")[0];
}
function oneYearAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

export default function AdminPage() {
  const router = useRouter();

  // Jobs state
  const [jobs,    setJobs]    = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RunResult>>({});

  // Historical load state
  const [histFrom,    setHistFrom]    = useState(oneYearAgo());
  const [histTo,      setHistTo]      = useState(today());
  const [histRunning, setHistRunning] = useState(false);
  const [histResult,  setHistResult]  = useState<HistoricalLoadResult | null>(null);
  const [histError,   setHistError]   = useState<string | null>(null);

  useEffect(() => {
    usersApi.me().then((user) => {
      if (user.role !== "admin") { router.replace("/transactions"); return; }
      adminApi.listJobs().then((data) => { setJobs(data.jobs); setLoading(false); });
    }).catch(() => router.replace("/transactions"));
  }, [router]);

  async function handleRun(jobId: string) {
    setRunning(jobId);
    setResults((prev) => ({ ...prev, [jobId]: undefined as unknown as RunResult }));
    try {
      const res = await adminApi.runJob(jobId);
      setResults((prev) => ({ ...prev, [jobId]: { status: res.status as "success" | "error", message: res.message } }));
      const updated = await adminApi.listJobs();
      setJobs(updated.jobs);
    } catch (e: unknown) {
      setResults((prev) => ({ ...prev, [jobId]: { status: "error", message: String(e) } }));
    } finally {
      setRunning(null);
    }
  }

  async function handleHistoricalLoad() {
    setHistRunning(true);
    setHistResult(null);
    setHistError(null);
    try {
      const res = await adminApi.historicalLoad(histFrom, histTo);
      setHistResult(res);
    } catch (e: unknown) {
      setHistError(String(e));
    } finally {
      setHistRunning(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted text-sm">Carregando...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-text-primary mb-1">Painel Admin</h1>
        <p className="text-sm text-muted">Gerencie e execute os jobs agendados manualmente.</p>
      </div>

      {/* ── Jobs agendados ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Jobs Agendados</h2>

        {jobs.map((job) => {
          const result    = results[job.id];
          const isRunning = running === job.id;

          return (
            <div key={job.id} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary">{job.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{job.description}</p>

                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-text-secondary">
                    <span><span className="text-muted">Agendamento:</span> {job.schedule}</span>
                    <span>
                      <span className="text-muted">Próxima execução:</span>{" "}
                      {job.next_run_time
                        ? new Date(job.next_run_time).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                        : "—"}
                    </span>
                    <span>
                      <span className="text-muted">Última atualização:</span>{" "}
                      {job.last_run_date
                        ? new Date(job.last_run_date + "T12:00:00").toLocaleDateString("pt-BR")
                        : "Nunca"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRun(job.id)}
                  disabled={isRunning || running !== null || histRunning}
                  className="shrink-0 px-4 py-2 text-xs font-medium rounded-lg bg-primary hover:bg-primary-hover text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRunning ? "Executando..." : "Executar"}
                </button>
              </div>

              {result && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${result.status === "success" ? "bg-accent/10 text-accent border border-accent/20" : "bg-danger/10 text-danger border border-danger/20"}`}>
                  {result.status === "success" ? "Concluído: " : "Erro: "}{result.message}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ── Carga Histórica ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Carga Histórica</h2>
          <p className="text-xs text-muted mt-1">
            Carrega cotações de câmbio (USD/EUR) e preços de ativos (crypto, ações BR, stocks EUA) para um período.
            Usa os símbolos já cadastrados nas transações.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted uppercase tracking-wider">Data Início</label>
              <input
                type="date"
                value={histFrom}
                onChange={(e) => setHistFrom(e.target.value)}
                className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted uppercase tracking-wider">Data Fim</label>
              <input
                type="date"
                value={histTo}
                onChange={(e) => setHistTo(e.target.value)}
                className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleHistoricalLoad}
              disabled={histRunning || running !== null || !histFrom || !histTo}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary-hover text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {histRunning ? "Carregando..." : "Carregar"}
            </button>
          </div>

          {histRunning && (
            <p className="text-xs text-muted animate-pulse">
              Buscando dados históricos... pode levar alguns minutos dependendo da quantidade de símbolos.
            </p>
          )}

          {histError && (
            <div className="px-3 py-2 rounded-lg text-xs bg-danger/10 text-danger border border-danger/20">
              Erro: {histError}
            </div>
          )}

          {histResult && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-accent">Carga concluída!</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Câmbio (USD/EUR)", value: `${histResult.exchange_rates.loaded} registros` },
                  { label: "Crypto",           value: `${histResult.crypto.loaded} registros — ${histResult.crypto.symbols.join(", ") || "—"}` },
                  { label: "Ações BR",         value: `${histResult.br_stocks.loaded} registros — ${histResult.br_stocks.tickers.join(", ") || "—"}` },
                  { label: "Stocks EUA",       value: `${histResult.us_stocks.loaded} registros — ${histResult.us_stocks.tickers.join(", ") || "—"}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-2 border border-border rounded-lg px-3 py-2">
                    <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
                    <p className="text-xs text-text-primary mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
