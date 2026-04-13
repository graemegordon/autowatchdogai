"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { FileText, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMessage("Check your email for a magic link!");
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMessage("Account created! Check your email to confirm.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = "/dashboard";
    }
    setLoading(false);
  }

  async function handleGoogleAuth() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4">
      {/* Canada flag stripe */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[var(--accent)]" />

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[var(--accent)] mb-4">
            <FileText size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">ATIP Request Generator</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            AI-powered Access to Information tools for Canadian journalists
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-8 shadow-sm">
          <div className="flex gap-1 mb-6 bg-[var(--background)] rounded-lg p-1">
            {(["signin", "signup", "magic"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setMessage(""); }}
                className={`flex-1 py-1.5 text-sm rounded-md transition-all font-medium ${
                  mode === m
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {m === "signin" ? "Sign in" : m === "signup" ? "Sign up" : "Magic link"}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@newsroom.ca"
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {mode !== "magic" && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={mode !== "magic"}
                    placeholder="••••••••"
                    minLength={8}
                    className="w-full pl-9 pr-3 py-2.5 bg-[var(--background)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send magic link"}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--card-border)]" />
            </div>
            <div className="relative flex justify-center text-xs text-[var(--muted)]">
              <span className="px-2 bg-[var(--card)]">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleAuth}
            className="w-full py-2.5 bg-[var(--background)] border border-[var(--card-border)] hover:border-[var(--foreground)] text-[var(--foreground)] font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          For authorized Canadian journalism use only.
          <br />
          ATIP requests are governed by the{" "}
          <span className="underline">Access to Information Act</span>.
        </p>
      </div>
    </div>
  );
}
