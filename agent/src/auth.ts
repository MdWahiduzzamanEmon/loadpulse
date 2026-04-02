/**
 * Auth module — logs into the target server and manages tokens.
 */

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getToken(
  serverUrl: string,
  credentials: { username: string; password: string }
): Promise<string> {
  // Return cached token if still valid (5 min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 300_000) {
    return cachedToken;
  }

  const loginUrl = `${serverUrl}/api/v1/auth/login/`;
  const res = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...credentials,
      device_id: "loadpulse-agent",
      device_info: { os: "loadpulse", model: "agent" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  cachedToken = data.access;
  // JWT default expiry is usually 5-60 min; assume 30 min
  tokenExpiry = Date.now() + 30 * 60 * 1000;
  return cachedToken!;
}

export function clearToken() {
  cachedToken = null;
  tokenExpiry = 0;
}
