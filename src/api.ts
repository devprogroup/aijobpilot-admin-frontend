import type {
  Crawler,
  CrawlerType,
  CrawlerTypePayload,
  CreateCrawlerPayload,
  UpdateCrawlerPayload,
  User,
} from "./types";
const base = import.meta.env.VITE_API_URL || "http://localhost:4100/api";
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const api = {
  crawlers: () => request<{ crawlers: Crawler[] }>("/crawlers"),
  crawler: (id: number) => request<{ crawler: Crawler }>(`/crawlers/${id}`),
  updateCrawler: (id: number, payload: UpdateCrawlerPayload) =>
    request<{ crawler: Crawler }>(`/crawlers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  toggleCrawler: (id: number, active: boolean) =>
    request(`/crawlers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    }),
  queueCrawler: (id: number) =>
    request<{ crawler: Crawler }>(`/crawlers/${id}/run`, { method: "POST" }),
  crawlerTypes: () =>
    request<{ crawlerTypes: CrawlerType[] }>("/crawler-types"),
  createCrawler: (payload: CreateCrawlerPayload) =>
    request<{ crawler: Crawler }>("/crawlers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createCrawlerType: (payload: CrawlerTypePayload) =>
    request<{ crawlerType: CrawlerType }>("/crawler-types", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCrawlerType: (id: number, payload: CrawlerTypePayload) =>
    request<{ crawlerType: CrawlerType }>(`/crawler-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCrawlerType: (id: number) =>
    request<void>(`/crawler-types/${id}`, { method: "DELETE" }),
  users: () => request<{ users: User[] }>("/users"),
  setUserStatus: (id: string, status: string) =>
    request(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
