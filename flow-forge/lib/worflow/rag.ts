import { retrieveContext } from "@/lib/rag/query";

export async function executeRAG(config: any, input: any, userId: string) {
  const question = typeof input === "string" ? input : input.question;
  const context = await retrieveContext(userId, question, config.top_k || 5);

  const prompt = config.prompt_template
    .replace("{{context}}", context)
    .replace("{{question}}", question);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}
