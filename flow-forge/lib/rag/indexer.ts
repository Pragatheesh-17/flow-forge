import { pineconeIndex } from "@/lib/pinecone/client";
import { chunkText } from "./chunk";
import { embedText } from "./embedding";

export async function indexDocument(
  documentId: string,
  userId: string,
  text: string
) {
  const chunks = chunkText(text);

  const vectors = await Promise.all(
    chunks.map(async (chunk, i) => ({
      id: `${documentId}-${i}`,
      values: await embedText(chunk),
      metadata: {
        documentId,
        userId,
        text: chunk,
      },
    }))
  );

  await pineconeIndex.upsert(vectors);
}
