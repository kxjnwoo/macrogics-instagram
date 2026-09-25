export function required(name: string) {
  const value =
    process.env[name] ||
    (name === "TWELVE_DATA_API_KEY"
      ? process.env.TWELVEDATA_API_KEY
      : undefined);
  if (!value) throw Error(`Missing configuration: ${name}`);
  return value;
}
export async function fetchJSON(
  url: string,
  init: RequestInit = {},
  attempt = 0,
): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      return fetchJSON(url, init, attempt + 1);
    }
    throw Error(`Network unavailable: ${new URL(url).hostname}`);
  }
  if ((response.status === 429 || response.status >= 500) && attempt < 2) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return fetchJSON(url, init, attempt + 1);
  }
  if (!response.ok)
    throw Error(`HTTP ${response.status}: ${new URL(url).hostname}`);
  return response.json();
}
