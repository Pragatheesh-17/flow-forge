export async function executeHttp(config: any, input: any) {
  const body =
    typeof config.body === "object"
      ? JSON.stringify({ ...config.body, input })
      : null;

  const res = await fetch(config.url, {
    method: config.method || "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return await res.json();
}
