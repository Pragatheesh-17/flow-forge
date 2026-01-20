export async function executeAI(config: any, input: any) {
  if (!config?.prompt_template) {
    throw new Error("AI_TRANSFORM node missing prompt_template");
  }

  const prompt = config.prompt_template.replace(
    "{{input}}",
    typeof input === "string" ? input : JSON.stringify(input)
  );

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Gemini API failed");
  }

  const data = await res.json();

  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}
