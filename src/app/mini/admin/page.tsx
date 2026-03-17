"use client";

import { useEffect, useState } from "react";
import { adminApi, marketDataApi, usersApi, JobStatus, AssetPriceHistoryItem } from "@/lib/api";

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateDiffLabel(dateStr: string | null): { label: string; stale: boolean } {
  if (!dateStr) return { label: "nunca", stale: true };
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffH = diffMs / 3_600_000;
  if (diffH < 1) return { label: "agora há pouco", stale: false };
  if (diffH < 24) return { label: `${Math.floor(diffH)}h atrás`, stale: false };
  const diffD = Math.floor(diffH / 24);
  return { label: `${diffD}d atrás`, stale: diffD >= 2 };
}

interface AssetSummary {
  symbol: string;
  lastDate: string;
  currency: string;
}

function buildAssetSummary(history: AssetPriceHistoryItem[]): AssetSummary[] {
  const map = new Map<string, string>();
  for (const p of history) {
    const existing = map.get(p.symbol);
    if (!existing || p.date > existing) map.set(p.symbol, p.date);
  }
  // currency lookup
  const currMap = new Map<string, string>();
  for (const p of history) currMap.set(p.symbol, p.currency);
  return [...map.entries()]
    .map(([symbol, lastDate]) => ({ symbol, lastDate, currency: currMap.get(symbol) ?? "—" }))
    .sort((a, b) => a.lastDate.localeCompare(b.lastDate)); // oldest first
}

export default function MiniAdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ jobId: string; message: string } | null>(null);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      try {
        const me = await usersApi.me();
        if (me.role !== "admin") { setIsAdmin(false); return; }
        setIsAdmin(true);
        const jobsRes = await adminApi.listJobs().catch(() => ({ jobs: [] as JobStatus[] }));
        setJobs(jobsRes.jobs ?? []);
      } finally {
        setLoading(false);
      }
    }

    async function loadAssets() {
      setAssetsLoading(true);
      try {
        const priceHist = await marketDataApi.assetPriceHistory();
        setAssets(buildAssetSummary(priceHist));
      } catch {
        // silently ignore — asset freshness is optional
      } finally {
        setAssetsLoading(false);
      }
    }

    loadJobs();
    loadAssets();
  }, []);

  async function runJob(jobId: string) {
    setRunning(jobId);
    setRunResult(null);
    try {
      const res = await adminApi.runJob(jobId);
      setRunResult({ jobId, message: res.message ?? res.status });
      const jobsRes = await adminApi.listJobs().catch(() => ({ jobs: [] as JobStatus[] }));
      setJobs(jobsRes.jobs ?? []);
    } catch (e: unknown) {
      setRunResult({ jobId, message: e instanceof Error ? e.message : "Erro" });
    } finally {
      setRunning(null);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-lg font-bold text-text-primary mb-6">Admin</h1>
        <p className="text-muted text-sm text-center py-8">Carregando...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-lg font-bold text-text-primary mb-6">Admin</h1>
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 text-sm text-danger text-center">
          Acesso negado. Esta página é exclusiva para administradores.
        </div>
      </div>
    );
  }

  const oldestAsset = assets[0] ?? null;
  const newestAsset = assets.length > 0 ? assets[assets.length - 1] : null;

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-lg font-bold text-text-primary">Admin</h1>

      {/* Jobs */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted mb-3 px-1">Jobs agendados</p>
        <div className="space-y-2">
          {jobs.map((job) => {
            const lastRun = dateDiffLabel(job.last_run_date);
            const isRunning = running === job.id;
            const result = runResult?.jobId === job.id ? runResult.message : null;
            return (
              <div key={job.id} className="bg-surface border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">{job.name}</p>
                    <p className="text-xs text-muted mt-0.5">{job.description}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-muted">
                        ⏰ {job.schedule}
                      </span>
                      <span className={`text-xs ${lastRun.stale ? "text-danger" : "text-muted"}`}>
                        ↻ {lastRun.label}
                      </span>
                      {job.next_run_time && (
                        <span className="text-xs text-muted">
                          → {fmt(job.next_run_time)}
                        </span>
                      )}
                    </div>
                    {result && (
                      <p className="text-xs text-accent mt-2 font-mono">{result}</p>
                    )}
                  </div>
                  <button
                    onClick={() => runJob(job.id)}
                    disabled={isRunning || running !== null}
                    className="shrink-0 px-3 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-semibold rounded-xl disabled:opacity-40 active:bg-primary/20 transition-colors"
                  >
                    {isRunning ? "..." : "▶ Run"}
                  </button>
                </div>
              </div>
            );
          })}
          {jobs.length === 0 && (
            <p className="text-muted text-sm text-center py-4">Nenhum job encontrado.</p>
          )}
        </div>
      </div>

      {/* Asset price freshness */}
      {(assetsLoading || assets.length > 0) && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-3 px-1">
            Preços de ativos {assetsLoading ? "(carregando…)" : `(${assets.length} monitorados)`}
          </p>

          {/* Summary row */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-surface border border-border rounded-2xl p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted">Mais antigo</p>
              {oldestAsset && (
                <>
                  <p className="text-sm font-mono font-semibold text-danger">{oldestAsset.symbol}</p>
                  <p className="text-xs text-muted">{oldestAsset.lastDate.split("-").reverse().join("/")}</p>
                </>
              )}
            </div>
            <div className="bg-surface border border-border rounded-2xl p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted">Mais recente</p>
              {newestAsset && (
                <>
                  <p className="text-sm font-mono font-semibold text-accent">{newestAsset.symbol}</p>
                  <p className="text-xs text-muted">{newestAsset.lastDate.split("-").reverse().join("/")}</p>
                </>
              )}
            </div>
          </div>

          {/* Full list */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-border">
              {assets.map((a) => {
                const diff = dateDiffLabel(a.lastDate + "T21:00:00Z");
                return (
                  <div key={a.symbol} className="flex items-center justify-between px-4 py-3 min-h-[44px]">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${diff.stale ? "bg-danger" : "bg-accent"}`} />
                      <span className="text-sm font-mono text-text-primary">{a.symbol}</span>
                      <span className="text-xs text-muted">{a.currency}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${diff.stale ? "text-danger" : "text-muted"}`}>{diff.label}</span>
                      <span className="text-xs text-muted">{a.lastDate.split("-").reverse().join("/")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
