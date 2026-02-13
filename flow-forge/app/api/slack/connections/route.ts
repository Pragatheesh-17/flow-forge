import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return NextResponse.json({ connections: [] }, { status: 401 });
  }

  const queryResult = await supabaseAdmin
    .from("slack_connections")
    .select("team_id")
    .eq("user_id", user.id)
    .order("team_id", { ascending: true });

  if (queryResult.error) {
    return NextResponse.json({ connections: [] }, { status: 500 });
  }

  const connections = (queryResult.data ?? []).map((row: any) => ({
    team_id: row.team_id,
    team_name: null,
  }));

  return NextResponse.json({ connections });
}
