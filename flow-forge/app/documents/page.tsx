import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDocument } from "./actions";

export default async function DocumentsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: 24 }}>
      <h1>Documents</h1>

      {/* Upload form */}
      <form action={createDocument}>
        <div>
          <input
            name="name"
            placeholder="Document name"
            required
          />
        </div>

        <div>
          <textarea
            name="content"
            placeholder="Paste document content here"
            rows={10}
            cols={80}
            required
          />
        </div>

        <button type="submit">Upload & Index</button>
      </form>

      <hr />

      {/* List documents */}
      <ul>
        {documents?.map((doc: any) => (
          <li key={doc.id}>
            <strong>{doc.name}</strong>
            <br />
            <small>{new Date(doc.created_at).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
