export async function executeHttp(config: any, input: any) {
  if (!config?.url) {
    throw new Error("HTTP_REQUEST node missing url");
  }

  const method = config.method || "POST";

  let body = undefined;

  if (config.body) {
    body = JSON.stringify({
      ...config.body,
      input,
    });
  }

  const res = await fetch(config.url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`HTTP request failed with status ${res.status}`);
  }

  return await res.json();
}
