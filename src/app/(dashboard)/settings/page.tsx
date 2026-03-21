"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import type { DisplayCurrency } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/utils";
import { usersApi, User } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const TIMEZONES = [
  { label: "Brasília (SP / RJ / MG / RS)", value: "America/Sao_Paulo" },
  { label: "Manaus (AM)", value: "America/Manaus" },
  { label: "Fortaleza / Recife (CE / PE)", value: "America/Fortaleza" },
  { label: "Belém (PA)", value: "America/Belem" },
  { label: "Cuiabá (MT)", value: "America/Cuiaba" },
  { label: "Rio Branco (AC)", value: "America/Rio_Branco" },
  { label: "Fernando de Noronha", value: "America/Noronha" },
  { label: "UTC", value: "UTC" },
  { label: "Nova York (EST/EDT)", value: "America/New_York" },
  { label: "Chicago (CST/CDT)", value: "America/Chicago" },
  { label: "Los Angeles (PST/PDT)", value: "America/Los_Angeles" },
  { label: "Lisboa", value: "Europe/Lisbon" },
  { label: "Londres", value: "Europe/London" },
  { label: "Berlim / Paris", value: "Europe/Berlin" },
  { label: "Moscou", value: "Europe/Moscow" },
  { label: "Dubai", value: "Asia/Dubai" },
  { label: "Tóquio", value: "Asia/Tokyo" },
];

const CURRENCIES: { value: DisplayCurrency; label: string; symbol: string }[] = [
  { value: "BRL", label: "Real Brasileiro", symbol: "R$" },
  { value: "USD", label: "Dólar Americano", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
];

function currentTzTime(tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date());
}

const inputCls = "w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all";
const labelCls = "block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2";

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface-2">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { timezone, displayCurrency, rates, updateSettings } = useSettings();
  const supabase = createClient();

  const usdRate = rates.USD ?? 5.0;
  const eurRate = rates.EUR ?? 5.5;

  // ── User profile state ─────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", username: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Email / password state ─────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    usersApi.me().then((u) => {
      setUser(u);
      setProfileForm({ first_name: u.first_name ?? "", last_name: u.last_name ?? "", username: u.username ?? "" });
    }).catch(() => {});
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await usersApi.update(profileForm);
      setUser(updated);
      setProfileMsg({ ok: true, text: "Perfil atualizado." });
    } catch (e: unknown) {
      setProfileMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao salvar." });
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveEmail() {
    if (!newEmail) return;
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailMsg({ ok: true, text: "Confirmação enviada para o novo e-mail." });
      setNewEmail("");
    } catch (e: unknown) {
      setEmailMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao atualizar e-mail." });
    } finally {
      setEmailSaving(false);
    }
  }

  async function savePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "As senhas não coincidem." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ ok: false, text: "Mínimo de 8 caracteres." });
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg({ ok: true, text: "Senha alterada com sucesso." });
      setNewPassword(""); setConfirmPassword("");
    } catch (e: unknown) {
      setPasswordMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao alterar senha." });
    } finally {
      setPasswordSaving(false);
    }
  }

  const preview100 = {
    BRL: formatCurrency(100, "BRL"),
    USD: formatCurrency(100 / usdRate, "USD"),
    EUR: formatCurrency(100 / eurRate, "EUR"),
  };

  return (
    <div className="px-4 md:px-6 py-5 max-w-5xl">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Configurações</h1>
        <p className="text-xs text-muted mt-0.5">Preferências de conta e exibição.</p>
      </div>

      {/* ── Cotações — full width strip ─────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Cotações do dia</h2>
            <p className="text-xs text-muted mt-0.5">Atualizadas diariamente às 21h UTC via AwesomeAPI.</p>
          </div>
        </div>
        <div className="px-5 py-4 flex gap-10">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">USD / BRL</p>
            <p className="text-2xl font-mono font-bold text-text-primary mt-1">
              {formatCurrency(usdRate, "BRL")}
            </p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">EUR / BRL</p>
            <p className="text-2xl font-mono font-bold text-text-primary mt-1">
              {formatCurrency(eurRate, "BRL")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* ── Left: account settings ──────────────────────────────────── */}
        <div className="space-y-6">

          {/* Perfil */}
          <Section title="Perfil" subtitle={user ? `${user.email}` : "Carregando..."}>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Primeiro nome</label>
                  <input value={profileForm.first_name} onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                    className={inputCls} placeholder="João" />
                </div>
                <div>
                  <label className={labelCls}>Sobrenome</label>
                  <input value={profileForm.last_name} onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                    className={inputCls} placeholder="Silva" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Username</label>
                <input value={profileForm.username} onChange={e => setProfileForm(p => ({ ...p, username: e.target.value }))}
                  className={inputCls} placeholder="joaosilva" />
              </div>
              <div className="flex items-center justify-between">
                {profileMsg && (
                  <p className={`text-xs ${profileMsg.ok ? "text-accent" : "text-danger"}`}>{profileMsg.text}</p>
                )}
                <button onClick={saveProfile} disabled={profileSaving}
                  className="ml-auto px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
                  {profileSaving ? "Salvando…" : "Salvar perfil"}
                </button>
              </div>
            </div>
          </Section>

          {/* E-mail */}
          <Section title="Alterar e-mail" subtitle="Uma confirmação será enviada para o novo endereço.">
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Novo e-mail</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className={inputCls} placeholder="novo@email.com" />
              </div>
              <div className="flex items-center justify-between">
                {emailMsg && (
                  <p className={`text-xs ${emailMsg.ok ? "text-accent" : "text-danger"}`}>{emailMsg.text}</p>
                )}
                <button onClick={saveEmail} disabled={emailSaving || !newEmail}
                  className="ml-auto px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
                  {emailSaving ? "Enviando…" : "Atualizar e-mail"}
                </button>
              </div>
            </div>
          </Section>

          {/* Senha */}
          <Section title="Alterar senha" subtitle="Mínimo de 8 caracteres.">
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nova senha</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className={inputCls} placeholder="••••••••" />
                </div>
                <div>
                  <label className={labelCls}>Confirmar senha</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className={inputCls} placeholder="••••••••" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                {passwordMsg && (
                  <p className={`text-xs ${passwordMsg.ok ? "text-accent" : "text-danger"}`}>{passwordMsg.text}</p>
                )}
                <button onClick={savePassword} disabled={passwordSaving || !newPassword}
                  className="ml-auto px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
                  {passwordSaving ? "Salvando…" : "Alterar senha"}
                </button>
              </div>
            </div>
          </Section>

        </div>

        {/* ── Right: display preferences ──────────────────────────────── */}
        <div className="space-y-6">

          {/* Moeda de exibição */}
          <Section title="Moeda de exibição" subtitle="Todos os valores são convertidos para esta moeda na visualização.">
            <div className="p-5 space-y-3">
              {CURRENCIES.map((cur) => {
                const active = displayCurrency === cur.value;
                return (
                  <button key={cur.value} onClick={() => updateSettings({ displayCurrency: cur.value })}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-150 text-left ${
                      active ? "bg-primary/10 border-primary/40" : "bg-surface-2 border-border hover:bg-surface-3"
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold font-mono ${
                        active ? "bg-primary/20 text-primary" : "bg-surface-3 text-muted"
                      }`}>{cur.symbol}</span>
                      <div>
                        <p className={`text-sm font-medium ${active ? "text-text-primary" : "text-text-secondary"}`}>{cur.label}</p>
                        <p className="text-xs text-muted font-mono">R$ 100 → {preview100[cur.value]}</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-primary" : "border-border"}`}>
                      {active && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {displayCurrency !== "BRL" && (
              <div className="px-5 pb-5">
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <p className="text-xs text-muted">
                    Os valores originais não são alterados. A conversão usa a cotação do dia.
                  </p>
                </div>
              </div>
            )}
          </Section>

          {/* Fuso horário */}
          <Section title="Fuso horário" subtitle="Afeta a exibição de datas e horas nas transações.">
            <div className="p-5 grid grid-cols-2 gap-2">
              {TIMEZONES.map((tz) => {
                const active = timezone === tz.value;
                return (
                  <button key={tz.value} onClick={() => updateSettings({ timezone: tz.value })}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-150 text-left ${
                      active ? "bg-primary/10 border-primary/40" : "bg-surface-2 border-border hover:bg-surface-3"
                    }`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs block truncate ${active ? "text-text-primary font-medium" : "text-text-secondary"}`}>{tz.label}</span>
                      {active && <span className="text-[10px] font-mono text-muted">{currentTzTime(tz.value)}</span>}
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${active ? "border-primary" : "border-border"}`}>
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
