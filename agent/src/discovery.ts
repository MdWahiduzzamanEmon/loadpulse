/**
 * Endpoint discovery — finds all API endpoints and their allowed HTTP methods.
 *
 * Strategies (tried in order):
 * 1. OpenAPI schema from /api/schema/ (most accurate, has all methods)
 * 2. DRF API root + OPTIONS probe (probes each endpoint for allowed methods)
 */

import type { Endpoint } from "./types.js";

/**
 * Strategy 1: OpenAPI schema endpoint.
 */
async function discoverFromSchema(serverUrl: string): Promise<Endpoint[] | null> {
  try {
    const res = await fetch(`${serverUrl}/api/schema/?format=json`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const schema = await res.json();
    const paths = schema.paths || {};
    const endpoints: Endpoint[] = [];

    for (const [path, methods] of Object.entries(paths)) {
      // Skip URL template paths like /services/{id}/ — they need real IDs
      // Only include "list" endpoints (no path params)
      if (path.includes("{") || path.includes("<")) continue;

      for (const [method, details] of Object.entries(methods as Record<string, any>)) {
        if (method === "parameters") continue;
        const pathParts = path.replace(/^\/api\/v\d+\//, "").split("/").filter(Boolean);
        endpoints.push({
          method: method.toUpperCase(),
          path,
          group: pathParts[0] || "other",
          description: details.summary || details.description || "",
          requiresAuth: (details.security || schema.security || []).length > 0,
          parameters: (details.parameters || []).map((p: any) => `${p.name} (${p.in})`),
        });
      }
    }
    return endpoints.length > 0 ? endpoints : null;
  } catch {
    return null;
  }
}

/**
 * Probe a single endpoint with GET to check if it's accessible.
 * Returns the actual allowed methods from the response or "Allow" header.
 */
async function probeEndpoint(
  serverUrl: string,
  path: string,
  token?: string
): Promise<{ methods: string[]; description: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    // Try GET first — most list endpoints support it
    const res = await fetch(`${serverUrl}${path}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 405) {
      // GET not allowed — check Allow header for actual methods
      const allow = res.headers.get("Allow") || "";
      const methods = allow.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean);
      return { methods: methods.length > 0 ? methods : ["POST"], description: "" };
    }

    // GET succeeded (200, 401, 403 all mean GET is a valid method)
    const allow = res.headers.get("Allow") || "";
    const methods = allow.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean);
    return {
      methods: methods.length > 0 ? methods : ["GET"],
      description: "",
    };
  } catch {
    // Timeout or network error — assume GET
    return { methods: ["GET"], description: "" };
  }
}

/**
 * Strategy 2: DRF API root + method probing.
 * Fetches the API root to get endpoint URLs, then probes each for allowed methods.
 */
async function discoverFromApiRoot(
  serverUrl: string,
  token?: string,
  onProgress?: (msg: string) => void
): Promise<Endpoint[] | null> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${serverUrl}/api/v1/`, { headers });
    if (!res.ok) return null;

    const data = await res.json();
    if (typeof data !== "object") return null;

    // Collect all endpoint URLs from root and sub-roots
    const urlMap = new Map<string, string>(); // path → display name

    for (const [name, url] of Object.entries(data)) {
      if (typeof url !== "string") continue;
      const path = new URL(url as string).pathname;
      urlMap.set(path, name.replace(/[-_]/g, " "));
    }

    // Probe sub-roots for nested endpoints
    const rootPaths = [...urlMap.keys()];
    for (const rootPath of rootPaths.slice(0, 20)) {
      try {
        const subRes = await fetch(`${serverUrl}${rootPath}`, {
          headers,
          signal: AbortSignal.timeout(5000),
        });
        if (!subRes.ok) continue;
        const subData = await subRes.json();

        if (typeof subData === "object" && !Array.isArray(subData) && !subData.results) {
          for (const [subName, subUrl] of Object.entries(subData)) {
            if (typeof subUrl === "string" && subUrl.startsWith("http")) {
              const subPath = new URL(subUrl).pathname;
              if (!urlMap.has(subPath)) {
                urlMap.set(subPath, subName.replace(/[-_]/g, " "));
              }
            }
          }
        }
      } catch {
        // skip unreachable sub-endpoints
      }
    }

    // Probe each endpoint to find allowed methods
    onProgress?.(`Probing ${urlMap.size} endpoints for allowed methods...`);
    const endpoints: Endpoint[] = [];

    // Probe in parallel (batches of 10)
    const entries = [...urlMap.entries()];
    for (let i = 0; i < entries.length; i += 10) {
      const batch = entries.slice(i, i + 10);
      const results = await Promise.all(
        batch.map(async ([path, name]) => {
          const probe = await probeEndpoint(serverUrl, path, token);
          const pathParts = path.replace(/^\/api\/v\d+\//, "").split("/").filter(Boolean);
          const group = pathParts[0] || "other";

          // Create one Endpoint entry per supported method
          return probe.methods.map((method) => ({
            method,
            path,
            group,
            description: name,
            requiresAuth: true,
            parameters: [],
          }));
        })
      );
      endpoints.push(...results.flat());
    }

    // Sort: GET first, then by group, then by path
    endpoints.sort((a, b) => {
      if (a.method === "GET" && b.method !== "GET") return -1;
      if (a.method !== "GET" && b.method === "GET") return 1;
      return a.group.localeCompare(b.group) || a.path.localeCompare(b.path);
    });

    return endpoints.length > 0 ? endpoints : null;
  } catch {
    return null;
  }
}

/**
 * Main discovery function — tries strategies in order.
 */
export async function discoverEndpoints(
  serverUrl: string,
  token?: string,
  onProgress?: (msg: string) => void
): Promise<Endpoint[]> {
  onProgress?.("Trying OpenAPI schema...");
  const fromSchema = await discoverFromSchema(serverUrl);
  if (fromSchema) return fromSchema;

  onProgress?.("Schema not available, probing API root...");
  const fromRoot = await discoverFromApiRoot(serverUrl, token, onProgress);
  if (fromRoot) return fromRoot;

  throw new Error(
    "Could not discover endpoints. Ensure the server has /api/schema/ or a browsable API root at /api/v1/"
  );
}
