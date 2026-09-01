"use client";

import { FormEvent, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function JoinForm({ token }: { token: string }) {
  const [error, setError] = useState(token ? "" : "This invitation link is incomplete.");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = { token, displayName: form.get("displayName"), password: form.get("password") };
    try {
      const response = await fetch("/api/auth/accept-invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invitation could not be accepted.");
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password: String(payload.password) });
      if (signInError) throw signInError;
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invitation could not be accepted.");
      setLoading(false);
    }
  }

  return <main className="simple-auth-shell"><form className="auth-card" onSubmit={submit}><span className="signin-mark"><Users /></span><p className="eyebrow">Staff invitation</p><h2>Join the farm team</h2><p>Create your password. Your account will have secure read-only access.</p><label>Your full name<input name="displayName" required /></label><label>Create password<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>{error && <div className="auth-error">{error}</div>}<button className="signin-button" type="submit" disabled={loading || !token}><ShieldCheck /> {loading ? "Creating account…" : "Create staff login"}</button><small>Only the farm owner can add or change animal records.</small></form></main>;
}
