import { createClient } from "@supabase/supabase-js";

function createAdminFetch(serviceKey: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);

    // New sb_secret_ keys are API keys, not JWTs. Some Supabase client
    // requests add the project key as a Bearer token as well as an apikey,
    // which makes PostgREST try to parse it as a JWT ("Invalid Compact JWS").
    // Keep the apikey header and remove only that invalid Bearer fallback.
    if (
      serviceKey.startsWith("sb_secret_") &&
      headers.get("Authorization") === `Bearer ${serviceKey}`
    ) {
      headers.delete("Authorization");
    }

    return fetch(input, { ...init, headers });
  };
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: createAdminFetch(serviceRoleKey) },
  });
}