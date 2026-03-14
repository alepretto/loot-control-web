"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function MiniLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push("/mini");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10 gap-4">
        <Image
          src="/nav-icon.png"
          alt="Loot Control"
          width={64}
          height={64}
          className="rounded-2xl"
          priority
        />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary">Loot Control</h1>
          <p className="text-sm text-muted mt-1">Controle financeiro sem atrito</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
            className="w-full bg-surface border border-border rounded-xl px-4 py-4 text-base text-text-primary placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-2">
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full bg-surface border border-border rounded-xl px-4 py-4 text-base text-text-primary placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-base transition-colors min-h-[56px]"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
