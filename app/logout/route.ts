import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Redirect to login even when the expired session cannot be cleared remotely.
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
