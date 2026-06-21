import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getMode(value: string | string[] | undefined) {
  return value === "signup" ? "signup" : "login";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const mode = getMode(resolvedSearchParams.mode);
  const errorMessage =
    typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;

  async function handleAuth(formData: FormData) {
    "use server";

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const formMode = getMode(String(formData.get("mode") || "login"));

    if (!email || !password) {
      redirect(`/login?mode=${formMode}&error=${encodeURIComponent("Email and password are required.")}`);
    }

    const supabase = await createSupabaseServerClient();

    const result =
      formMode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      redirect(
        `/login?mode=${formMode}&error=${encodeURIComponent(result.error.message)}`
      );
    }

    redirect("/workflows");
  }

  return (
    <div style={{ maxWidth: 420, margin: "100px auto", padding: 24 }}>
      <h2 style={{ marginBottom: 12 }}>{mode === "signup" ? "Sign Up" : "Login"}</h2>

      {errorMessage ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #7f1d1d",
            background: "#1f1111",
            color: "#fca5a5",
          }}
        >
          {errorMessage}
        </div>
      ) : null}

      <form action={handleAuth} style={{ display: "grid", gap: 12 }}>
        <input type="hidden" name="mode" value={mode} />
        <input
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />

        <button type="submit" style={{ padding: 10, borderRadius: 8 }}>
          {mode === "signup" ? "Create Account" : "Login"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        {mode === "signup" ? (
          <a href="/login" style={{ textDecoration: "underline" }}>
            Already have an account? Login
          </a>
        ) : (
          <a href="/login?mode=signup" style={{ textDecoration: "underline" }}>
            New user? Create an account
          </a>
        )}
      </div>
    </div>
  );
}
