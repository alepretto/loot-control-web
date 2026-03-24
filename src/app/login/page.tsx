"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { tagFamiliesApi } from "@/lib/api";

type Mode = "login" | "signup" | "forgot";
type Feedback = { type: "error" | "success"; message: string };

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  function switchMode(m: Mode) {
    setMode(m);
    setFeedback(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setFeedback({ type: "error", message: error.message });
      setLoading(false);
    } else {
      try {
        const families = await tagFamiliesApi.list();
        router.push(families.length === 0 ? "/onboarding" : "/summary");
      } catch {
        router.push("/summary");
      }
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      setFeedback({ type: "error", message: error.message });
    } else {
      setFeedback({
        type: "success",
        message: "Link enviado! Verifique seu e-mail.",
      });
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (signupPassword !== signupConfirm) {
      setFeedback({ type: "error", message: "As senhas não coincidem." });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { username, first_name: firstName, last_name: lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (error) {
      setFeedback({ type: "error", message: error.message });
      setLoading(false);
      return;
    }
    if (!data.session) {
      setFeedback({
        type: "success",
        message:
          "Cadastro realizado! Verifique seu e-mail para confirmar a conta.",
      });
      setLoading(false);
      return;
    }
    router.push("/onboarding");
  }

  const headings: Record<Mode, { title: string; sub: string }> = {
    login: {
      title: "Bem-vindo de volta",
      sub: "Entre para acessar seu painel",
    },
    signup: {
      title: "Criar sua conta",
      sub: "Comece a controlar suas finanças hoje",
    },
    forgot: {
      title: "Recuperar senha",
      sub: "Enviaremos um link para o seu e-mail",
    },
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left Feature Panel ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col bg-surface border-r border-border relative overflow-hidden">
        {/* Atmospheric background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(37,99,235,0.10) 0%, transparent 60%)," +
              "radial-gradient(ellipse 60% 40% at 80% 80%, rgba(34,197,94,0.05) 0%, transparent 55%)",
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #e6edf3 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative flex flex-col h-full p-10 xl:p-12">
          {/* Logo — ícone pequeno no canto */}
          <div className="flex items-center gap-3">
            <Image
              src="/nav-icon.png"
              alt="Loot Control"
              width={34}
              height={34}
              className="rounded-xl"
            />
            <span className="text-base font-semibold text-text-primary tracking-tight">
              Loot Control
            </span>
          </div>

          {/* Main copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-8">
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-[0.18em] mb-4">
                  Controle financeiro pessoal
                </p>
                <h1 className="text-3xl xl:text-[2.25rem] font-bold text-text-primary leading-[1.2] tracking-tight">
                  Suas finanças,
                  <br />
                  <span className="text-primary">sem atrito.</span>
                </h1>
                <p className="text-text-secondary mt-4 text-sm leading-relaxed max-w-xs">
                  Registre gastos, acompanhe investimentos e entenda para onde
                  vai seu dinheiro — simples como uma planilha, poderoso como um
                  app.
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-2.5">
                {[
                  {
                    icon: "⚡",
                    label: "Rápido como uma planilha",
                    desc: "Double-click para editar qualquer lançamento",
                  },
                  {
                    icon: "📊",
                    label: "Resumo mensal automático",
                    desc: "KPIs, gráficos e checklist de gastos por tag",
                  },
                  {
                    icon: "💼",
                    label: "Investimentos em um lugar",
                    desc: "Cripto, ações, renda fixa e stocks EUA",
                  },
                  {
                    icon: "🤖",
                    label: "Agente IA integrado",
                    desc: "Registre e consulte pelo chat em linguagem natural",
                  },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-border/50 bg-surface-2/40"
                  >
                    <span className="text-base leading-none mt-0.5 shrink-0">
                      {f.icon}
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-text-primary leading-none mb-1">
                        {f.label}
                      </p>
                      <p className="text-[11px] text-muted leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer links */}
          <div className="flex items-center gap-4">
            <Link
              href="/demo"
              className="text-xs text-muted hover:text-text-primary transition-colors"
            >
              Ver demonstração →
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/"
              className="text-xs text-muted hover:text-text-primary transition-colors"
            >
              Página inicial
            </Link>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Mobile-only background */}
        <div className="absolute -top-48 -right-24 w-[450px] h-[450px] bg-primary/4 rounded-full blur-3xl pointer-events-none lg:hidden" />

        <div className="w-full max-w-[360px] relative">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text-primary transition-colors mb-8"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Voltar ao início
          </Link>

          {/* Logo grande — visível em todos os tamanhos no painel do form */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl scale-110 pointer-events-none" />
              <Image
                src="/logo.png"
                alt="Loot Control"
                width={240}
                height={240}
                className="relative rounded-2xl"
                priority
              />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              {headings[mode].title}
            </h2>
            <p className="text-sm text-muted mt-1.5">{headings[mode].sub}</p>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`mb-5 text-xs rounded-xl px-4 py-3 border ${
                feedback.type === "error"
                  ? "text-danger bg-danger/8 border-danger/20"
                  : "text-accent bg-accent/8 border-accent/20"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* ── LOGIN ──────────────────────────────────────────────────────── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="seu@email.com"
                  className={inputClass}
                />
              </Field>
              <Field label="Senha">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={inputClass}
                />
              </Field>
              <div className="pt-1">
                <PrimaryButton
                  loading={loading}
                  label="Entrar"
                  loadingLabel="Entrando..."
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs text-muted hover:text-text-primary transition-colors"
                >
                  Esqueceu a senha?
                </button>
                <p className="text-xs text-muted">
                  Sem conta?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    Criar grátis
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ── SIGNUP ─────────────────────────────────────────────────────── */}
          {mode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoFocus
                    placeholder="João"
                    className={inputClass}
                  />
                </Field>
                <Field label="Sobrenome">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Silva"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Username">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="joaosilva"
                  className={inputClass}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className={inputClass}
                />
              </Field>
              <Field label="Senha">
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="mínimo 6 caracteres"
                  className={inputClass}
                />
              </Field>
              <Field label="Confirmar senha">
                <input
                  type="password"
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={inputClass}
                />
              </Field>
              <div className="pt-1">
                <PrimaryButton
                  loading={loading}
                  label="Criar conta"
                  loadingLabel="Criando..."
                />
              </div>
              <p className="text-center text-xs text-muted pt-1">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-primary hover:text-primary-hover font-medium transition-colors"
                >
                  Entrar
                </button>
              </p>
            </form>
          )}

          {/* ── FORGOT ─────────────────────────────────────────────────────── */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="seu@email.com"
                  className={inputClass}
                />
              </Field>
              <div className="pt-1">
                <PrimaryButton
                  loading={loading}
                  label="Enviar link"
                  loadingLabel="Enviando..."
                />
              </div>
              <p className="text-center text-xs text-muted pt-1">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-primary hover:text-primary-hover font-medium transition-colors"
                >
                  ← Voltar ao login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

const inputClass =
  "w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted " +
  "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-150";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] text-muted uppercase tracking-[0.12em] font-semibold mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function PrimaryButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
