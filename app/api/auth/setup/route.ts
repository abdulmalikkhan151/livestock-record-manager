import { createAdminClient } from "@/lib/supabase/admin";
import { secretsMatch } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const displayName = String(payload.displayName || "").trim();
  const farmName = String(payload.farmName || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const setupCode = String(payload.setupCode || "");
  const expectedCode = process.env.OWNER_SETUP_CODE || "";

  if (!displayName || !farmName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Owner name, farm name and a valid email are required." }, { status: 400 });
  }
  if (password.length < 10) return Response.json({ error: "Password must contain at least 10 characters." }, { status: 400 });
  if (!expectedCode || !secretsMatch(setupCode, expectedCode)) {
    return Response.json({ error: "The private setup code is incorrect." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { count, error: countError } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if (countError) return Response.json({ error: countError.message }, { status: 500 });
  if ((count ?? 0) > 0) return Response.json({ error: "Owner setup is already complete. Please use the login page." }, { status: 409 });

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (authError || !created.user) return Response.json({ error: authError?.message || "Owner account could not be created." }, { status: 400 });

  const farmId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { error: farmError } = await admin.from("farms").insert({ id: farmId, name: farmName, owner_id: created.user.id, created_at: now, updated_at: now });
  if (farmError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: farmError.message }, { status: 500 });
  }
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    farm_id: farmId,
    email,
    display_name: displayName,
    role: "owner",
    active: true,
    created_at: now,
    last_seen_at: now,
  });
  if (profileError) {
    await admin.from("farms").delete().eq("id", farmId);
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: profileError.message }, { status: 500 });
  }

  await admin.from("activity_logs").insert({ farm_id: farmId, actor_id: created.user.id, actor_email: email, action: "owner.setup", entity_type: "farm", entity_id: farmId, details: { farmName } });
  return Response.json({ ok: true, email }, { status: 201 });
}
