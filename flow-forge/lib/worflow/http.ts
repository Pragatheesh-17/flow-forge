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

  const responseData = await res.json();

  // Extract specific path from response if configured
  if (config.response_path) {
    const keys = config.response_path.split(".");
    let result = responseData;

    for (const key of keys) {
      result = result[key];
      if (result === undefined) {
        throw new Error(`Response path "${config.response_path}" not found`);
      }
    }

    return result;
  }

  return responseData;
}
