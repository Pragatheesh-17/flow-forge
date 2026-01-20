import { pineconeIndex } from "@/lib/pinecone/client";
import { embedText } from "./embedding";

export async function retrieveContext(
  userId: string,
  question: string,
  topK = 5
) {
  const vector = await embedText(question);

  const res = await pineconeIndex.query({
    vector,
    topK,
    includeMetadata: true,
    filter: { userId },
  });

  return res.matches?.map((m) => m.metadata?.text).join("\n\n");
}
