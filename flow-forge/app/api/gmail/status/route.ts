import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const { data: connection, error } = await supabaseAdmin
    .from("gmail_connections")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ connected: false }, { status: 500 });
  }

  return NextResponse.json({ connected: !!connection });
}

