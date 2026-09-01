import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const token = String(payload.token || "");
  const displayName = String(payload.displayName || "").trim();
  const password = String(payload.password || "");
  if (!token || !displayName) return Response.json({ error: "Invitation link and staff name are required." }, { status: 400 });
  if (password.length < 10) return Response.json({ error: "Password must contain at least 10 characters." }, { status: 400 });

  const admin = createAdminClient();
  const { data: invitation, error } = await admin.from("staff_invitations")
    .select("id,farm_id,email,active,expires_at,accepted_at")
    .eq("token_hash", hashToken(token))
    .eq("active", true)
    .is("accepted_at", null)
    .maybeSingle();
  if (error || !invitation) return Response.json({ error: "This invitation is invalid or has already been used." }, { status: 404 });
  if (new Date(invitation.expires_at).getTime() < Date.now()) return Response.json({ error: "This invitation has expired. Ask the Owner for a new link." }, { status: 410 });

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (authError || !created.user) return Response.json({ error: authError?.message || "Staff account could not be created." }, { status: 400 });

  const now = new Date().toISOString();
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    farm_id: invitation.farm_id,
    email: invitation.email,
    display_name: displayName,
    role: "staff",
    active: true,
    created_at: now,
    last_seen_at: now,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: profileError.message }, { status: 500 });
  }
  await admin.from("staff_invitations").update({ accepted_at: now, active: false, updated_at: now }).eq("id", invitation.id);
  await admin.from("activity_logs").insert({ farm_id: invitation.farm_id, actor_id: created.user.id, actor_email: invitation.email, action: "staff.joined", entity_type: "profile", entity_id: created.user.id });
  return Response.json({ ok: true, email: invitation.email }, { status: 201 });
}
