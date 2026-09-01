export function mapAnimal(row: Record<string, unknown>, photoUrl: string | null = null) {
  return {
    id: row.id,
    tagNumber: row.tag_number,
    name: row.name,
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    status: row.status,
    dateOfBirth: row.date_of_birth,
    color: row.color,
    location: row.location,
    sellerName: row.seller_name,
    sellerPhone: row.seller_phone,
    purchaseDate: row.purchase_date,
    purchasePrice: row.purchase_price,
    purchaseWeightKg: row.purchase_weight_kg,
    currentWeightKg: row.current_weight_kg,
    recordSource: row.record_source,
    notes: row.notes,
    photoPath: row.photo_path,
    photoName: row.photo_name,
    photoUrl,
    createdBy: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProfile(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function mapInvitation(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
  };
}
