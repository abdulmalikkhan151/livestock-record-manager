"use client";

import { FormEvent, useState } from "react";
import { Beef, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(form.get("email") || "").trim().toLowerCase(),
        password: String(form.get("password") || ""),
      });
      if (signInError) throw signInError;
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login failed.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand"><span><Beef /></span><strong>Livestock<small>Record Manager</small></strong></div>
        <div><p className="eyebrow">Private farm control</p><h1>Every animal’s complete story, in one secure place.</h1><p>Search cows, buffaloes and goats. Review purchase, weight, health, expense and sale history from any device.</p></div>
        <small>Independent website · No ChatGPT account required</small>
      </section>
      <section className="auth-form-panel">
        <form className="auth-card" onSubmit={submit}>
          <span className="signin-mark"><LockKeyhole /></span>
          <p className="eyebrow">Secure access</p>
          <h2>Sign in to your farm</h2>
          <p>Use the account approved by your farm owner.</p>
          <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
          <label>Password<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required minLength={8} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>
          {error && <div className="auth-error">{error}</div>}
          <button className="signin-button" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in securely"}</button>
          <small>New staff? Open the private invitation link sent by the Owner.</small>
        </form>
      </section>
    </main>
  );
}
