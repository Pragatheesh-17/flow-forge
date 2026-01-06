import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function WorkflowsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Your Workflows</h1>
      <p>Welcome, {user.email}</p>
      <LogoutButton />
    </div>
  );
}
