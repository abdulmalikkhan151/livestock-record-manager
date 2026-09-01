import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, ownerOnly, unauthorized } from "@/lib/server/current-user";
import { mapInvitation, mapProfile } from "@/lib/server/mappers";
import { hashToken, randomToken } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorized();
  const admin = createAdminClient();
  const { data: teamRows, error: teamError } = await admin.from("profiles").select("*").eq("farm_id", currentUser.farmId).order("last_seen_at", { ascending: false });
  if (teamError) return Response.json({ error: teamError.message }, { status: 500 });
  const invitations = currentUser.role === "owner"
    ? (await admin.from("staff_invitations").select("id,email,display_name,active,created_at,updated_at,expires_at,accepted_at").eq("farm_id", currentUser.farmId).order("updated_at", { ascending: false })).data || []
    : [];
  return Response.json({ team: (teamRows || []).map((row) => mapProfile(row)), invitations: invitations.map((row) => mapInvitation(row)), currentUser });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorized();
  if (currentUser.role !== "owner") return ownerOnly();

  const payload = (await request.json()) as { email?: string; displayName?: string };
  const email = payload.email?.trim().toLowerCase() ?? "";
  const displayName = payload.displayName?.trim() || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid staff email address." }, { status: 400 });
  }
  if (email === currentUser.email) {
    return Response.json({ error: "This email already belongs to the Owner." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("farm_id", currentUser.farmId).eq("email", email).maybeSingle();
  if (existing) return Response.json({ error: "This email already belongs to a farm team member." }, { status: 409 });

  const now = new Date().toISOString();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: row, error } = await admin.from("staff_invitations").upsert({
    farm_id: currentUser.farmId,
    email,
    display_name: displayName,
    token_hash: hashToken(token),
    active: true,
    invited_by: currentUser.id,
    expires_at: expiresAt,
    accepted_at: null,
    created_at: now,
    updated_at: now,
  }, { onConflict: "farm_id,email" }).select("id,email,display_name,active,created_at,updated_at,expires_at,accepted_at").single();
  if (error || !row) return Response.json({ error: error?.message || "Invitation could not be created." }, { status: 500 });
  const invitationUrl = `${new URL(request.url).origin}/join?token=${encodeURIComponent(token)}`;
  await admin.from("activity_logs").insert({ farm_id: currentUser.farmId, actor_id: currentUser.id, actor_email: currentUser.email, action: "staff.invited", entity_type: "invitation", entity_id: row.id, details: { email } });
  return Response.json({ invitation: mapInvitation(row), invitationUrl }, { status: 201 });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorized();
  if (currentUser.role !== "owner") return ownerOnly();
  const payload = (await request.json()) as { userId?: string; invitationId?: string; active?: boolean };
  const admin = createAdminClient();
  if (payload.userId) {
    if (payload.userId === currentUser.id) return Response.json({ error: "The Owner account cannot be disabled." }, { status: 400 });
    const { error } = await admin.from("profiles").update({ active: Boolean(payload.active) }).eq("id", payload.userId).eq("farm_id", currentUser.farmId).eq("role", "staff");
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } else if (payload.invitationId) {
    const { error } = await admin.from("staff_invitations").update({ active: Boolean(payload.active), updated_at: new Date().toISOString() }).eq("id", payload.invitationId).eq("farm_id", currentUser.farmId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } else {
    return Response.json({ error: "A staff member or invitation is required." }, { status: 400 });
  }
  return Response.json({ ok: true });
}
