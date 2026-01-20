"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { indexDocument } from "@/lib/rag/indexer";

export async function createDocument(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const content = formData.get("content") as string;

  if (!name || !content) {
    throw new Error("Name and content are required");
  }

  // 1️⃣ Save document in Supabase
  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      name,
      content,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // 2️⃣ Index document in Pinecone (RAG)
  await indexDocument(doc.id, user.id, content);
}
