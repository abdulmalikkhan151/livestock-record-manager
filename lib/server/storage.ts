import { createAdminClient } from "@/lib/supabase/admin";

export const STORAGE_BUCKET = "animal-files";

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
}

export async function uploadAnimalFile(file: File, farmId: string, animalId: string, folder: "photos" | "records") {
  const maxSize = folder === "photos" ? 8 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > maxSize) throw new Error(`File is too large. Maximum size is ${folder === "photos" ? "8 MB" : "15 MB"}.`);
  const allowed = folder === "photos"
    ? ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
    : ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) throw new Error("Unsupported file type.");

  const path = `${farmId}/${animalId}/${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const admin = createAdminClient();
  const { error } = await admin.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path, name: file.name, contentType: file.type };
}

export async function signedFileUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await createAdminClient().storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}
