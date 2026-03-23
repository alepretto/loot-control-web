"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Feedback = { type: "error" | "success"; message: string };

const inputClass =
  "w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all duration-150";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setFeedback({ type: "error", message: "As senhas não coincidem." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setFeedback({ type: "error", message: error.message });
    } else {
      setFeedback({ type: "success", message: "Senha redefinida com sucesso!" });
      setTimeout(() => router.push("/summary"), 1500);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-accent/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
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
          <p className="text-text-secondary text-sm">Controle financeiro sem atrito</p>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="mb-5">
            <p className="text-sm font-medium text-text-primary mb-1">Nova senha</p>
            <p className="text-xs text-muted">Escolha uma senha segura para sua conta.</p>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-text-secondary mb-1.5 uppercase tracking-[0.1em] font-semibold">
                Nova senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="mínimo 6 caracteres"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary mb-1.5 uppercase tracking-[0.1em] font-semibold">
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200 shadow-glow-sm hover:shadow-glow-primary disabled:cursor-not-allowed mt-1"
            >
              {loading ? "Salvando..." : "Redefinir senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
