import type {
  CatalogCollections,
  CollectionName,
  FeatureSettings,
  PricingSettings,
} from "@/lib/types";
import { MOCK_CATALOG } from "@/lib/firebase/mock-catalog";
import { DEFAULT_PRICING_SETTINGS } from "@/lib/pricing/defaults";
import { normalizePricingSettings } from "@/lib/pricing/normalizePricing";

function resolveApiUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env === "" || env === "/") return "";
  if (env) return env.replace(/\/$/, "");
  return "http://localhost:8000";
}

const API_URL = resolveApiUrl();

export function isApiConfigured(): boolean {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env === "" || env === "/") return true;
  return Boolean(env);
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...customHeaders,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, headers });
  } catch {
    throw new ApiError("Nie można połączyć się z API. Uruchom backend FastAPI.", 0);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(
      typeof detail === "string" ? detail : JSON.stringify(detail),
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  bramaEnabled: true,
  furtkaEnabled: true,
};

export async function fetchFeatures(): Promise<FeatureSettings> {
  try {
    return await request<FeatureSettings>("/api/features");
  } catch (err) {
    if (err instanceof ApiError && (err.status === 0 || err.status >= 500)) {
      console.warn("[API] Fallback do domyślnych flag funkcji:", err.message);
      return DEFAULT_FEATURE_SETTINGS;
    }
    throw err;
  }
}

export async function fetchFeaturesForAdmin(
  token: string,
): Promise<FeatureSettings> {
  return request<FeatureSettings>("/api/admin/features", { token });
}

export async function updateFeatures(
  data: FeatureSettings,
  token: string,
): Promise<FeatureSettings> {
  return request<FeatureSettings>("/api/admin/features", {
    method: "PUT",
    body: JSON.stringify(data),
    token,
  });
}

export async function fetchPricing(): Promise<PricingSettings> {
  try {
    const data = await request<PricingSettings>("/api/pricing");
    return normalizePricingSettings(data);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 0 || err.status >= 500)) {
      console.warn("[API] Fallback do domyślnych stawek wyceny:", err.message);
      return DEFAULT_PRICING_SETTINGS;
    }
    throw err;
  }
}

export async function fetchPricingForAdmin(
  token: string,
): Promise<PricingSettings> {
  const data = await request<PricingSettings>("/api/admin/pricing", { token });
  return normalizePricingSettings(data);
}

export async function updatePricingSettings(
  data: PricingSettings,
  token: string,
): Promise<PricingSettings> {
  const saved = await request<PricingSettings>("/api/admin/pricing", {
    method: "PUT",
    body: JSON.stringify(data),
    token,
  });
  return normalizePricingSettings(saved);
}

export async function applyDefaultPricing(
  token: string,
): Promise<{ message: string; counts: Record<string, number> }> {
  return request("/api/admin/pricing/apply-defaults", {
    method: "POST",
    token,
  });
}

export async function fetchActiveCatalog(): Promise<CatalogCollections> {
  try {
    return await request<CatalogCollections>("/api/catalog");
  } catch (err) {
    if (err instanceof ApiError && (err.status === 0 || err.status >= 500)) {
      console.warn("[API] Fallback do danych demo:", err.message);
      return MOCK_CATALOG;
    }
    throw err;
  }
}

export async function fetchAllForAdmin<T extends { id: string }>(
  collection: CollectionName,
  token: string,
): Promise<T[]> {
  return request<T[]>(`/api/admin/${collection}`, { token });
}

export async function createEntity(
  collection: CollectionName,
  data: Record<string, unknown>,
  token: string,
): Promise<{ id: string }> {
  return request(`/api/admin/${collection}`, {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export async function updateEntity(
  collection: CollectionName,
  id: string,
  data: Record<string, unknown>,
  token: string,
): Promise<void> {
  await request(`/api/admin/${collection}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    token,
  });
}

export async function deleteEntity(
  collection: CollectionName,
  id: string,
  token: string,
): Promise<void> {
  await request(`/api/admin/${collection}/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function seedCatalog(token: string): Promise<{
  message: string;
  counts: Record<string, number>;
}> {
  return request("/api/admin/seed", { method: "POST", token });
}

export { ApiError };
