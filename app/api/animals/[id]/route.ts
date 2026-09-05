import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, ownerOnly, unauthorized } from "@/lib/server/current-user";
import { mapAnimal } from "@/lib/server/mappers";
import { signedFileUrl, uploadAnimalFile } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  const admin = createAdminClient();
  const { data: animal } = await admin.from("animals").select("*").eq("id", id).eq("farm_id", user.farmId).maybeSingle();
  if (!animal) return Response.json({ error: "Animal not found." }, { status: 404 });

  const [weightsResult, healthResult, expensesResult, salesResult, filesResult] = await Promise.all([
    admin.from("weight_records").select("*").eq("animal_id", id).eq("farm_id", user.farmId).order("measured_at", { ascending: false }),
    admin.from("health_records").select("*").eq("animal_id", id).eq("farm_id", user.farmId).order("event_date", { ascending: false }),
    admin.from("expense_records").select("*").eq("animal_id", id).eq("farm_id", user.farmId).order("expense_date", { ascending: false }),
    admin.from("sale_records").select("*").eq("animal_id", id).eq("farm_id", user.farmId).order("sale_date", { ascending: false }),
    admin.from("attachments").select("*").eq("animal_id", id).eq("farm_id", user.farmId).order("uploaded_at", { ascending: false }),
  ]);
  const files = filesResult.data || [];

  return Response.json({
    animal: mapAnimal(animal, await signedFileUrl(animal.photo_path)),
    weights: (weightsResult.data || []).map((row) => ({ id: row.id, weightKg: row.weight_kg, measuredAt: row.measured_at, notes: row.notes })),
    health: (healthResult.data || []).map((row) => ({ id: row.id, category: row.category, title: row.title, eventDate: row.event_date, veterinarian: row.veterinarian, cost: row.cost, nextDueDate: row.next_due_date, notes: row.notes })),
    expenses: (expensesResult.data || []).map((row) => ({ id: row.id, category: row.category, amount: row.amount, expenseDate: row.expense_date, notes: row.notes })),
    sales: (salesResult.data || []).map((row) => ({ id: row.id, saleDate: row.sale_date, salePrice: row.sale_price, saleWeightKg: row.sale_weight_kg, buyerName: row.buyer_name, buyerPhone: row.buyer_phone, notes: row.notes })),
    attachments: await Promise.all(files.map(async (file) => ({ id: file.id, fileName: file.file_name, category: file.category, fileUrl: await signedFileUrl(file.file_path) }))),
  });
}

function textValue(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(data: FormData, key: string) {
  const value = textValue(data, key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "owner") return ownerOnly();
  const { id } = await context.params;
  const admin = createAdminClient();
  const { data: existing } = await admin.from("animals").select("*").eq("id", id).eq("farm_id", user.farmId).maybeSingle();
  if (!existing) return Response.json({ error: "Animal not found." }, { status: 404 });

  const data = await request.formData();
  const tagNumber = textValue(data, "tagNumber");
  const species = textValue(data, "species");
  const sex = textValue(data, "sex");
  const status = textValue(data, "status");
  if (!tagNumber || !["Cow", "Buffalo", "Goat", "Camel"].includes(species || "") || !["Female", "Male"].includes(sex || "") || !["Active", "Sold", "Deceased"].includes(status || "")) {
    return Response.json({ error: "Tag number, type, sex and status are required." }, { status: 400 });
  }
  const { data: duplicate } = await admin.from("animals").select("id").eq("farm_id", user.farmId).eq("tag_number", tagNumber).neq("id", id).maybeSingle();
  if (duplicate) return Response.json({ error: "This tag number already exists." }, { status: 409 });

  const photo = data.get("photo");
  const storedPhoto = photo instanceof File && photo.size > 0 ? await uploadAnimalFile(photo, user.farmId, id, "photos") : null;
  const now = new Date().toISOString();
  const updates = {
    tag_number: tagNumber, name: textValue(data, "name"), species, breed: textValue(data, "breed"), sex, status,
    date_of_birth: textValue(data, "dateOfBirth"), color: textValue(data, "color"), location: textValue(data, "location"),
    seller_name: textValue(data, "sellerName"), seller_phone: textValue(data, "sellerPhone"), purchase_date: textValue(data, "purchaseDate"),
    purchase_price: numberValue(data, "purchasePrice"), purchase_weight_kg: numberValue(data, "purchaseWeightKg"),
    record_source: textValue(data, "recordSource"), notes: textValue(data, "notes"),
    ...(storedPhoto ? { photo_path: storedPhoto.path, photo_name: storedPhoto.name } : {}),
    updated_at: now,
  };
  const { data: updated, error } = await admin.from("animals").update(updates).eq("id", id).eq("farm_id", user.farmId).select("*").single();
  if (error || !updated) return Response.json({ error: error?.message || "Animal could not be updated." }, { status: 500 });
  if (storedPhoto && existing.photo_path) await admin.storage.from("animal-files").remove([existing.photo_path]);
  await admin.from("activity_logs").insert({ farm_id: user.farmId, actor_id: user.id, actor_email: user.email, action: "animal.updated", entity_type: "animal", entity_id: id, details: { tagNumber } });
  return Response.json({ animal: mapAnimal(updated, await signedFileUrl(updated.photo_path)) });
}
