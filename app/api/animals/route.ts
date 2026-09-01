import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, ownerOnly, unauthorized } from "@/lib/server/current-user";
import { mapAnimal } from "@/lib/server/mappers";
import { signedFileUrl, uploadAnimalFile } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const admin = createAdminClient();
  const { data: rows, error } = await admin.from("animals").select("*").eq("farm_id", user.farmId).order("updated_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const mapped = await Promise.all((rows || []).map(async (animal) => mapAnimal(animal, await signedFileUrl(animal.photo_path))));
  return Response.json({
    animals: mapped,
    user,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "owner") return ownerOnly();

  try {
    const data = await request.formData();
    const tagNumber = textValue(data, "tagNumber");
    const species = textValue(data, "species");
    const sex = textValue(data, "sex");
    if (!tagNumber || !["Cow", "Buffalo", "Goat"].includes(species ?? "") || !["Female", "Male"].includes(sex ?? "")) {
      return Response.json({ error: "Tag number, animal type and sex are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: duplicate } = await admin.from("animals").select("id").eq("farm_id", user.farmId).eq("tag_number", tagNumber).maybeSingle();
    if (duplicate) return Response.json({ error: "This tag number already exists." }, { status: 409 });

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const photo = data.get("photo");
    const sourceFile = data.get("sourceFile");
    const storedPhoto = photo instanceof File && photo.size > 0 ? await uploadAnimalFile(photo, user.farmId, id, "photos") : null;
    const storedSource = sourceFile instanceof File && sourceFile.size > 0 ? await uploadAnimalFile(sourceFile, user.farmId, id, "records") : null;
    const purchaseWeight = numberValue(data, "purchaseWeightKg");

    const animal = {
      id, farm_id: user.farmId,
      tag_number: tagNumber,
      name: textValue(data, "name"),
      species: species as "Cow" | "Buffalo" | "Goat",
      breed: textValue(data, "breed"),
      sex: sex as "Female" | "Male",
      status: "Active",
      date_of_birth: textValue(data, "dateOfBirth"),
      color: textValue(data, "color"),
      location: textValue(data, "location"),
      seller_name: textValue(data, "sellerName"),
      seller_phone: textValue(data, "sellerPhone"),
      purchase_date: textValue(data, "purchaseDate"),
      purchase_price: numberValue(data, "purchasePrice"),
      purchase_weight_kg: purchaseWeight,
      current_weight_kg: purchaseWeight,
      record_source: textValue(data, "recordSource"),
      notes: textValue(data, "notes"),
      photo_path: storedPhoto?.path ?? null,
      photo_name: storedPhoto?.name ?? null,
      created_by: user.id,
      created_by_email: user.email,
      created_at: now,
      updated_at: now,
    };

    const { error: insertError } = await admin.from("animals").insert(animal);
    if (insertError) throw new Error(insertError.message);
    if (purchaseWeight !== null) {
      const { error } = await admin.from("weight_records").insert({
        farm_id: user.farmId, animal_id: id, weight_kg: purchaseWeight,
        measured_at: animal.purchase_date ?? now.slice(0, 10), notes: "Weight at purchase",
        created_by: user.id, created_by_email: user.email, created_at: now,
      });
      if (error) throw new Error(error.message);
    }
    if (storedSource) {
      const { error } = await admin.from("attachments").insert({
        farm_id: user.farmId, animal_id: id, file_path: storedSource.path,
        file_name: storedSource.name, content_type: storedSource.contentType,
        category: "Source record", uploaded_by: user.id, uploaded_by_email: user.email, uploaded_at: now,
      });
      if (error) throw new Error(error.message);
    }
    await admin.from("activity_logs").insert({ farm_id: user.farmId, actor_id: user.id, actor_email: user.email, action: "animal.created", entity_type: "animal", entity_id: id, details: { tagNumber, species } });
    return Response.json({ animal: mapAnimal(animal, await signedFileUrl(storedPhoto?.path)) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Animal could not be saved.";
    return Response.json({ error: message }, { status: 500 });
  }
}
