import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, ownerOnly, unauthorized } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "owner") return ownerOnly();
  const admin = createAdminClient();
  const tables = ["farms", "profiles", "staff_invitations", "animals", "weight_records", "health_records", "expense_records", "sale_records", "attachments", "activity_logs"] as const;
  const entries = await Promise.all(tables.map(async (table) => {
    const query = table === "farms" ? admin.from(table).select("*").eq("id", user.farmId) : admin.from(table).select("*").eq("farm_id", user.farmId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return [table, data || []] as const;
  }));
  const backup = {
    format: "livestock-record-manager-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    farmId: user.farmId,
    exportedBy: user.email,
    data: Object.fromEntries(entries),
    note: "File bytes in private storage are referenced by path. Keep Supabase Storage backups enabled as documented.",
  };
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="livestock-backup-${stamp}.json"`,
      "cache-control": "no-store",
    },
  });
}
