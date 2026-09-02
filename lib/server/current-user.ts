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
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Read the signed-in user's profile with their own session. The profiles
    // table's RLS policies allow approved farm members to read their profile,
    // so login must not depend on the server-only service-role key.
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id,farm_id,email,display_name,role,active,created_at,last_seen_at")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !profile || !profile.active) return null;

    const now = new Date().toISOString();
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
