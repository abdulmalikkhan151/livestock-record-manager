import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  farmId: string;
  email: string;
  displayName: string;
  role: "owner" | "staff";
  active: boolean;
  createdAt: string;
  lastSeenAt: string;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const auth = await createServerSupabaseClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id,farm_id,email,display_name,role,active,created_at,last_seen_at")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !profile || !profile.active) return null;

    const now = new Date().toISOString();
    void admin.from("profiles").update({ last_seen_at: now }).eq("id", profile.id);
    return {
      id: profile.id,
      farmId: profile.farm_id,
      email: profile.email,
      displayName: profile.display_name,
      role: profile.role,
      active: profile.active,
      createdAt: profile.created_at,
      lastSeenAt: now,
    };
  } catch {
    return null;
  }
}

export function unauthorized(message = "Please sign in with an approved account.") {
  return Response.json({ error: message }, { status: 401 });
}

export function ownerOnly() {
  return Response.json({ error: "Only the farm owner can make changes." }, { status: 403 });
}
