import type {
  Crawler,
  CrawlerType,
  CrawlerTypePayload,
  CreateCrawlerPayload,
  UpdateCrawlerPayload,
  User,
  ServiceHealth,
  AppConfig,
  EmailTemplate,
  EmailTemplatePayload,
  AdminUser,
  ProviderBalance,
} from "./types";
const base = import.meta.env.VITE_API_URL || "http://localhost:4100/api";
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "/auth/login" && path !== "/auth/me") {
      window.dispatchEvent(new Event("admin:unauthorized"));
    }
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const api = {
  login: (email: string, password: string) =>
    request<{ user: AdminUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<{ user: AdminUser }>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  serviceHealth: (serviceId: ServiceHealth["id"]) =>
    request<ServiceHealth>(`/service-health/${encodeURIComponent(serviceId)}`),
  deepSeekBalance: () => request<ProviderBalance>("/provider-balances/deepseek"),
  openAiBalance: () => request<ProviderBalance>("/provider-balances/openai"),
  twoCaptchaBalance: () => request<ProviderBalance>("/2captcha"),
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
  settings: () => request<{ settings: AppConfig[] }>("/settings"),
  createSetting: (payload: Pick<AppConfig, "key" | "value">) =>
    request<{ setting: AppConfig }>("/settings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateSetting: (key: string, value: string) =>
    request<{ setting: AppConfig }>(`/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
  deleteSetting: (key: string) =>
    request<void>(`/settings/${encodeURIComponent(key)}`, { method: "DELETE" }),
  emailTemplates: () =>
    request<{ emailTemplates: EmailTemplate[] }>("/email-templates"),
  createEmailTemplate: (payload: EmailTemplatePayload) =>
    request<{ emailTemplate: EmailTemplate }>("/email-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateEmailTemplate: (id: number, payload: EmailTemplatePayload) =>
    request<{ emailTemplate: EmailTemplate }>(`/email-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteEmailTemplate: (id: number) =>
    request<void>(`/email-templates/${id}`, { method: "DELETE" }),
};
