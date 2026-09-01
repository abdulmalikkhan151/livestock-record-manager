"use client";

import { FormEvent, useState } from "react";
import { Beef, ShieldCheck } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SetupForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/auth/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Owner setup failed.");
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: String(values.email), password: String(values.password) });
      if (signInError) throw signInError;
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Owner setup failed.");
      setLoading(false);
    }
  }

  return <main className="simple-auth-shell"><form className="auth-card wide" onSubmit={submit}><span className="signin-mark"><Beef /></span><p className="eyebrow">One-time setup</p><h2>Create the farm owner account</h2><p>This page works only once. The setup code comes from the private Vercel environment settings.</p><div className="auth-grid"><label>Owner name<input name="displayName" required placeholder="Full name" /></label><label>Farm name<input name="farmName" required placeholder="e.g. Malik Livestock Farm" /></label><label>Owner email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label><label className="full">Private setup code<input name="setupCode" type="password" required /></label></div>{error && <div className="auth-error">{error}</div>}<button className="signin-button" type="submit" disabled={loading}><ShieldCheck /> {loading ? "Creating secure owner…" : "Create Owner account"}</button><small>Never share the setup code or service keys with staff.</small></form></main>;
}
