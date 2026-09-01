import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, ownerOnly, unauthorized } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";

type RecordPayload = Record<string, string | number | null | undefined> & { type?: string };
const requiredText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const optionalNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "owner") return ownerOnly();
  const { id: animalId } = await context.params;
  const admin = createAdminClient();
  const { data: animal } = await admin.from("animals").select("id").eq("id", animalId).eq("farm_id", user.farmId).maybeSingle();
  if (!animal) return Response.json({ error: "Animal not found." }, { status: 404 });

  const payload = (await request.json()) as RecordPayload;
  const now = new Date().toISOString();

  if (payload.type === "weight") {
    const weightKg = optionalNumber(payload.weightKg);
    const measuredAt = requiredText(payload.measuredAt);
    if (weightKg === null || !measuredAt) return Response.json({ error: "Weight and date are required." }, { status: 400 });
    const { error } = await admin.from("weight_records").insert({ farm_id: user.farmId, animal_id: animalId, weight_kg: weightKg, measured_at: measuredAt, notes: requiredText(payload.notes), created_by: user.id, created_by_email: user.email, created_at: now });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await admin.from("animals").update({ current_weight_kg: weightKg, updated_at: now }).eq("id", animalId).eq("farm_id", user.farmId);
  } else if (payload.type === "health") {
    const title = requiredText(payload.title);
    const eventDate = requiredText(payload.eventDate);
    const category = requiredText(payload.category);
    if (!title || !eventDate || !["Vaccination", "Treatment", "Checkup"].includes(category ?? "")) {
      return Response.json({ error: "Health type, title and date are required." }, { status: 400 });
    }
    const { error } = await admin.from("health_records").insert({ farm_id: user.farmId, animal_id: animalId, category, title, event_date: eventDate, veterinarian: requiredText(payload.veterinarian), cost: optionalNumber(payload.cost), next_due_date: requiredText(payload.nextDueDate), notes: requiredText(payload.notes), created_by: user.id, created_by_email: user.email, created_at: now });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await admin.from("animals").update({ updated_at: now }).eq("id", animalId).eq("farm_id", user.farmId);
  } else if (payload.type === "expense") {
    const category = requiredText(payload.category);
    const amount = optionalNumber(payload.amount);
    const expenseDate = requiredText(payload.expenseDate);
    if (!category || amount === null || !expenseDate) return Response.json({ error: "Expense category, amount and date are required." }, { status: 400 });
    const { error } = await admin.from("expense_records").insert({ farm_id: user.farmId, animal_id: animalId, category, amount, expense_date: expenseDate, notes: requiredText(payload.notes), created_by: user.id, created_by_email: user.email, created_at: now });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await admin.from("animals").update({ updated_at: now }).eq("id", animalId).eq("farm_id", user.farmId);
  } else if (payload.type === "sale") {
    const saleDate = requiredText(payload.saleDate);
    const salePrice = optionalNumber(payload.salePrice);
    if (!saleDate || salePrice === null) return Response.json({ error: "Sale date and price are required." }, { status: 400 });
    const { error } = await admin.from("sale_records").insert({ farm_id: user.farmId, animal_id: animalId, sale_date: saleDate, sale_price: salePrice, sale_weight_kg: optionalNumber(payload.saleWeightKg), buyer_name: requiredText(payload.buyerName), buyer_phone: requiredText(payload.buyerPhone), notes: requiredText(payload.notes), created_by: user.id, created_by_email: user.email, created_at: now });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await admin.from("animals").update({ status: "Sold", updated_at: now }).eq("id", animalId).eq("farm_id", user.farmId);
  } else {
    return Response.json({ error: "Unknown record type." }, { status: 400 });
  }

  await admin.from("activity_logs").insert({ farm_id: user.farmId, actor_id: user.id, actor_email: user.email, action: `animal.${payload.type}.added`, entity_type: "animal", entity_id: animalId });
  return Response.json({ ok: true }, { status: 201 });
}
