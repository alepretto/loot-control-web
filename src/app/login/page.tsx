"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Tab = "login" | "signup";
type Feedback = { type: "error" | "success"; message: string };

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setFeedback({ type: "error", message: error.message });
      setLoading(false);
    } else {
      router.push("/summary");
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
        message: "Cadastro realizado! Verifique seu e-mail para confirmar a conta.",
      });
      setLoading(false);
      return;
    }

    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      {/* Atmospheric gradients */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-accent/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Back to home */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text-primary transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Voltar ao início
          </Link>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/8 rounded-2xl blur-xl scale-110 pointer-events-none" />
              <Image
                src="/logo.png"
                alt="Loot Control"
                width={600}
                height={600}
                className="relative rounded-2xl"
                priority
              />
            </div>
          </div>
          <p className="text-text-secondary text-sm">
            Controle financeiro sem atrito
          </p>
        </div>

        {/* Tabs */}
        <div className="flex mb-4 bg-surface rounded-xl border border-border p-1">
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setFeedback(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                tab === t
                  ? "bg-primary text-white shadow-glow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t === "login" ? "Entrar" : "Cadastrar"}
            </button>
          ))}
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          {feedback && (
            <div
              className={`mb-4 text-xs rounded-lg px-3 py-2.5 border ${
                feedback.type === "error"
                  ? "text-danger bg-danger/8 border-danger/20"
                  : "text-accent bg-accent/8 border-accent/20"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
              <SubmitButton loading={loading} label="Entrar" loadingLabel="Entrando..." />
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
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
              <SubmitButton loading={loading} label="Criar conta" loadingLabel="Criando..." />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all duration-150";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-text-secondary mb-1.5 uppercase tracking-[0.1em] font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function SubmitButton({
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
      className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200 shadow-glow-sm hover:shadow-glow-primary disabled:cursor-not-allowed mt-1"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
