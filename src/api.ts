import type {
  ApplicationSite,
  ApplicationSitePayload,
  Crawler,
  CrawledJobRow,
  CrawlerType,
  CrawlerTypePayload,
  CreateCrawlerPayload,
  UpdateCrawlerPayload,
  User,
  UserDetails,
  AdminApplication,
  ApplicationFilters,
  ServiceHealth,
  AppConfig,
  EmailTemplate,
  EmailTemplatePayload,
  AdminUser,
  ProviderBalance,
  AdminDepositAddress,
  PaymentNetwork,
  PaymentReceivingAddresses,
} from "./types";
const base = import.meta.env.VITE_API_URL || "http://localhost:4100/api";
const ADMIN_TOKEN_KEY = "jobpilot.adminToken";
export const getAdminToken = () => window.localStorage.getItem(ADMIN_TOKEN_KEY);
const setAdminToken = (token: string | null) => {
  if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const response = await fetch(`${base}${path}`, {
    ...options,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setAdminToken(null);
      if (path !== "/auth/login" && path !== "/auth/me") {
        window.dispatchEvent(new Event("admin:unauthorized"));
      }
    }
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const api = {
  applications: (page: number, filters: ApplicationFilters) =>
    request<{ applications: AdminApplication[]; total: number; page: number; pageSize: number }>(`/applications?${new URLSearchParams({
      page: String(page),
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.applicationSiteId ? { applicationSiteId: String(filters.applicationSiteId) } : {}),
      ...(filters.userId ? { userId: String(filters.userId) } : {}),
      ...(filters.profileId ? { profileId: String(filters.profileId) } : {}),
    })}`),
  applicationScreenshot: async (applicationId: number, key: "preview" | "result") => {
    const token = getAdminToken();
    const response = await fetch(`${base}/applications/${applicationId}/screenshots/${key}`, {
      credentials: "omit",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.status === 401) {
      setAdminToken(null);
      window.dispatchEvent(new Event("admin:unauthorized"));
    }
    if (!response.ok) throw new Error("Unable to load application screenshot.");
    return URL.createObjectURL(await response.blob());
  },
  failedApplicationStats: (from: string, to: string) =>
    request<{ total: number; bySite: { siteName: string; applied: number; failed: number }[]; byStatus: { status: string; count: number }[] }>(`/applications/failed/stats?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`),
  applicationSites: () => request<{ applicationSites: ApplicationSite[] }>("/application-sites"),
  createApplicationSite: (payload: ApplicationSitePayload) =>
    request<{ applicationSite: ApplicationSite }>("/application-sites", { method: "POST", body: JSON.stringify(payload) }),
  updateApplicationSite: (id: number, payload: Partial<ApplicationSitePayload>) =>
    request<{ applicationSite: ApplicationSite }>(`/application-sites/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  login: async (email: string, password: string) => {
    const result = await request<{ user: AdminUser; token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setAdminToken(result.token);
    return result;
  },
  me: () => request<{ user: AdminUser }>("/auth/me"),
  logout: async () => {
    try { await request<void>("/auth/logout", { method: "POST" }); }
    finally { setAdminToken(null); }
  },
  serviceHealth: (serviceId: ServiceHealth["id"]) =>
    request<ServiceHealth>(`/service-health/${encodeURIComponent(serviceId)}`),
  deepSeekBalance: () => request<ProviderBalance>("/provider-balances/deepseek"),
  openAiBalance: () => request<ProviderBalance>("/provider-balances/openai"),
  twoCaptchaBalance: () => request<ProviderBalance>("/2captcha"),
  paymentSummary: () => request<{ totalBalance: number; currency: "USDT" }>("/payments/summary"),
  paymentDepositAddresses: (page: number) => request<{ addresses: AdminDepositAddress[]; total: number; page: number; pageSize: number }>(`/payments?page=${page}`),
  paymentReceivingAddresses: () => request<{ addresses: PaymentReceivingAddresses }>("/payments/receiving-addresses"),
  updatePaymentReceivingAddress: (network: PaymentNetwork, address: string) => request<{ network: PaymentNetwork; address: string }>(`/payments/receiving-addresses/${network}`, { method: "PUT", body: JSON.stringify({ address }) }),
  crawlers: () => request<{ crawlers: Crawler[] }>("/crawlers"),
  crawler: (id: number) => request<{ crawler: Crawler }>(`/crawlers/${id}`),
  crawledJobs: (
    page: number,
    filters: { pageSize?: number; status?: string; crawlerId?: number } = {},
  ) => {
    const params: Record<string, string> = { page: String(page), pageSize: String(filters.pageSize ?? 25) };
    if (filters.status) params.status = filters.status;
    if (filters.crawlerId) params.crawlerId = String(filters.crawlerId);
    return request<{ crawledJobs: CrawledJobRow[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(
      `/crawlers/crawled-jobs?${new URLSearchParams(params)}`,
    );
  },
  retryCrawledJobs: (filters: { ids?: number[]; crawlerId?: number } = {}) =>
    request<{ retried: number; ids: number[] }>("/crawlers/crawled-jobs/retry", {
      method: "POST",
      body: JSON.stringify(filters),
    }),
  crawlerRunLog: (crawlerId: number, runId: string) =>
    request<{ content: string }>(`/crawlers/${crawlerId}/bot-runs/${encodeURIComponent(runId)}/log`),
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
  deleteCrawler: (id: number) =>
    request<void>(`/crawlers/${id}`, { method: "DELETE" }),
  uploadCrawledJobs: (crawlerId: number, jobs: unknown[]) =>
    request<{ crawlerRunId: number; count: number }>(`/crawlers/${crawlerId}/crawled-jobs`, {
      method: "POST",
      body: JSON.stringify({ jobs }),
    }),
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
  user: (id: number) => request<UserDetails>(`/users/${id}`),
  userPayments: (id: number, page: number) => request<{
    payments: { id:number; amount:number; currency:string; description:string|null; status:string; invoiceUrl:string|null; createdAt:string }[];
    total:number; page:number; pageSize:number;
  }>(`/users/${id}/payments?page=${page}`),
  updateUser: (id: number, payload: { name?: string | null; credit?: number }) =>
    request<{ user: User }>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  updateUserPassword: (id: number, password: string) =>
    request<{ success: boolean }>(`/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) }),
  setUserStatus: (id: number, status: User["status"]) =>
    request<{ user: User }>(`/users/${id}/status`, {
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
