import type {
  ApplicationStatusSummary,
  PromoCode,
  ApplicationSite,
  ApplicationSitePayload,
  Crawler,
  CrawlerRunProgress,
  CrawledJobRow,
  CrawlerType,
  CrawlerTypePayload,
  CreateCrawlerPayload,
  UpdateCrawlerPayload,
  User,
  UserDetails,
  AdminProfileDetails,
  AdminApplication,
  ApplicationFilters,
  ApplicationStatus,
  ServiceHealth,
  AppConfig,
  BonusPlan,
  BonusPlanPayload,
  ManagedApiKey,
  EmailTemplate,
  EmailTemplatePayload,
  ManagedFaq,
  AdminUser,
  AdminUserRole,
  ProviderBalance,
  AdminDepositAddress,
  PaymentNetwork,
  SystemMetrics,
  CleanupReport,
  MaintenanceEntry,
  MaintenancePayload,
  AdminEmail,
  EmailStatusFilter,
  AdminEmailSummary,
  InboundEmail,
  InboundEmailSummary,
  TenantsCsvUpload,
  TenantCsvFormat,
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
  supportMessages: () => request<{ messages: SupportMessage[] }>("/support-messages"),
  replyToSupportMessage: (id: number, content: string) =>
    request<{ sent: boolean }>(`/support-messages/${id}/reply`, { method: "POST", body: JSON.stringify({ content }) }),
  markSupportMessageRead: (id: number) =>
    request<{ id: number; isRead: boolean }>(`/support-messages/${id}/read`, { method: "POST" }),
  supportAttachment: async (id: number, index: number) => {
    const token = getAdminToken();
    const response = await fetch(`${base}/support-messages/${id}/attachments/${index}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error("Unable to load this attachment.");
    return URL.createObjectURL(await response.blob());
  },
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
  retryApplication: (applicationId: number) =>
    request<{ id: number; status: "queued" }>(`/applications/${applicationId}/retry`, { method: "POST" }),
  setApplicationStatus: (applicationId: number, status: ApplicationStatus) =>
    request<{ id: number; status: ApplicationStatus }>(`/applications/${applicationId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  setApplicationSource: (applicationId: number, source: AdminApplication["source"]) =>
    request<{ id: number; source: AdminApplication["source"] }>(`/applications/${applicationId}/source`, { method: "PATCH", body: JSON.stringify({ source }) }),
  applicationLog: (applicationId: number) =>
    request<{ content: string }>(`/applications/${applicationId}/log`),
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
    request<{ total: number; bySite: { siteName: string; applied: number; failed: number }[]; byStatus: { status: string; count: number }[]; runningByMode: { headless: number; headed: number; "chrome-extension": number } }>(`/applications/failed/stats?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`),
  wakeApplicationWorker: () =>
    request<{ ok: true }>("/applications/worker/wake", { method: "POST" }),
  applicationStatusSummary: (from: string, to: string) =>
    request<ApplicationStatusSummary>(`/applications/status-summary?${new URLSearchParams({ from, to })}`),
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
  forgotAdminPassword: (email: string) => request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetAdminPassword: (token: string, password: string) => request<{ success: boolean }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
  changeAdminPassword: (currentPassword: string, newPassword: string) => request<{ success: boolean }>("/auth/change-password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),
  logout: async () => {
    try { await request<void>("/auth/logout", { method: "POST" }); }
    finally { setAdminToken(null); }
  },
  adminUsers: () => request<{ adminUsers: AdminUser[] }>("/admin-users"),
  createAdminUser: (payload: { email: string; name: string | null; role: AdminUserRole; password: string }) => request<{ adminUser: AdminUser }>("/admin-users", { method: "POST", body: JSON.stringify(payload) }),
  updateAdminUser: (id: number, payload: Partial<{ email: string; name: string | null; role: AdminUserRole }>) => request<{ adminUser: AdminUser }>(`/admin-users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  setAdminUserStatus: (id: number, status: "active" | "inactive") => request<{ adminUser: AdminUser }>(`/admin-users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  setAdminUserPromocodeBalance: (id: number, promocodeBalance: number) => request<{ adminUser: AdminUser }>(`/admin-users/${id}/promocode-balance`, { method: "PATCH", body: JSON.stringify({ promocodeBalance }) }),
  updateAdminUserPassword: (id: number, password: string) => request<{ ok: true }>(`/admin-users/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) }),
  deleteAdminUser: (id: number) => request<{ ok: true }>(`/admin-users/${id}`, { method: "DELETE" }),
  promoCodes: () => request<{ promoCodes: PromoCode[]; balance: number | null; expireDays: number; freeCredit: number }>("/promo-codes"),
  generatePromoCodes: (count: number) => request<{ promoCodes: PromoCode[]; balance: number | null; deletedExpired: number }>("/promo-codes", { method: "POST", body: JSON.stringify({ count }) }),
  serviceHealth: (serviceId: ServiceHealth["id"]) =>
    request<ServiceHealth>(`/service-health/${encodeURIComponent(serviceId)}`),
  serviceLogs: () => request<{ services: { id: string; name: string; dates: string[] }[] }>("/service-logs"),
  serviceLog: (serviceId: string, date: string) =>
    request<{ content: string; truncated: boolean }>(`/service-logs/${encodeURIComponent(serviceId)}/${encodeURIComponent(date)}`),
  emails: (page: number, search: string, status: EmailStatusFilter) =>
    request<{ emails: AdminEmailSummary[]; total: number; page: number; pageSize: number }>(`/emails?${new URLSearchParams({ page: String(page), pageSize: "25", ...(search ? { search } : {}), status })}`),
  email: (id: number) => request<{ email: AdminEmail }>(`/emails/${id}`),
  deleteEmail: (id: number) => request<void>(`/emails/${id}`, { method: "DELETE" }),
  deleteAllEmails: (search: string, status: EmailStatusFilter) =>
    request<{ deleted: number }>(`/emails?${new URLSearchParams({ ...(search ? { search } : {}), status })}`, { method: "DELETE" }),
  inboundEmails: (page: number, search: string, status: EmailStatusFilter) =>
    request<{ emails: InboundEmailSummary[]; total: number; page: number; pageSize: number }>(`/inbound-emails?${new URLSearchParams({ page: String(page), pageSize: "25", ...(search ? { search } : {}), status })}`),
  inboundEmail: (id: number) => request<{ email: InboundEmail }>(`/inbound-emails/${id}`),
  deleteInboundEmail: (id: number) => request<void>(`/inbound-emails/${id}`, { method: "DELETE" }),
  deleteAllInboundEmails: (search: string, status: EmailStatusFilter) =>
    request<{ deleted: number }>(`/inbound-emails?${new URLSearchParams({ ...(search ? { search } : {}), status })}`, { method: "DELETE" }),
  systemMetrics: () => request<SystemMetrics>("/system-metrics"),
  triggerCleanup: () => request<CleanupReport>("/maintenance/cleanup", { method: "POST" }),
  maintenance: () => request<{ maintenance: MaintenanceEntry[] }>("/maintenance"),
  createMaintenance: (payload: MaintenancePayload) => request<{ maintenanceEntry: MaintenanceEntry }>("/maintenance", { method: "POST", body: JSON.stringify(payload) }),
  updateMaintenance: (id: number, payload: Partial<MaintenancePayload>) => request<{ maintenanceEntry: MaintenanceEntry }>(`/maintenance/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  startMaintenance: (id: number) => request<{ maintenanceEntry: MaintenanceEntry }>(`/maintenance/${id}/start`, { method: "POST" }),
  finishMaintenance: (id: number) => request<{ maintenanceEntry: MaintenanceEntry }>(`/maintenance/${id}/finish`, { method: "POST" }),
  deleteMaintenance: (id: number) => request<void>(`/maintenance/${id}`, { method: "DELETE" }),
  deepSeekBalance: () => request<ProviderBalance>("/provider-balances/deepseek"),
  openAiBalance: () => request<ProviderBalance>("/provider-balances/openai"),
  twoCaptchaBalance: () => request<ProviderBalance>("/2captcha"),
  paymentSummary: () => request<{ totalBalance: number; currency: "USDT" }>("/payments/summary"),
  paymentDepositAddresses: (page: number, search = "") => request<{ addresses: AdminDepositAddress[]; total: number; page: number; pageSize: number }>(`/payments?${new URLSearchParams({ page: String(page), ...(search ? { search } : {}) })}`),
  addPaymentWallet: (address: string) => request<{ wallet: AdminDepositAddress }>("/payments", { method: "POST", body: JSON.stringify({ address }) }),
  syncPaymentWalletBalance: (id: number) => request<{ wallet: AdminDepositAddress }>(`/payments/${id}/sync-balance`, { method: "POST" }),
  deletePaymentWallet: (id: number) => request<void>(`/payments/${id}`, { method: "DELETE" }),
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
  crawlerRunLog: (crawlerId: number, runId: string) =>
    request<{ content: string }>(`/crawlers/${crawlerId}/bot-runs/${encodeURIComponent(runId)}/log`),
  crawlerRunProgress: (crawlerId: number, runId: string) =>
    request<{ progress: CrawlerRunProgress }>(`/crawlers/${crawlerId}/bot-runs/${encodeURIComponent(runId)}/progress`),
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
  runAllCrawlers: () =>
    request<{ queued: number }>("/crawlers/run-all", { method: "POST" }),
  queueCrawler: (id: number) =>
    request<{ crawler: Crawler }>(`/crawlers/${id}/run`, { method: "POST" }),
  deleteCrawler: (id: number) =>
    request<void>(`/crawlers/${id}`, { method: "DELETE" }),
  uploadCrawledJobs: (crawlerId: number, jobs: unknown[]) =>
    request<{ crawlerRunId: number; count: number }>(`/crawlers/${crawlerId}/crawled-jobs`, {
      method: "POST",
      body: JSON.stringify({ jobs }),
    }),
  uploadTenantsCsv: (file: File, format: TenantCsvFormat = "greenhouse") =>
    request<TenantsCsvUpload>(`/crawlers/tenants-csv?fileName=${encodeURIComponent(file.name)}&format=${format}`, {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: file,
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
  sendUserMessage: (payload: { recipient: "all" | "user"; userId?: number; title: string; content: string; variant: "info" | "success" | "warning" | "error" }) =>
    request<{ sent: number }>("/messages", { method: "POST", body: JSON.stringify(payload) }),
  user: (id: number) => request<UserDetails>(`/users/${id}`),
  userProfile: (userId: number, profileId: number) =>
    request<{ profile: AdminProfileDetails }>(`/users/${userId}/profiles/${profileId}`),
  userProfileResume: async (userId: number, profileId: number) => {
    const token = getAdminToken();
    const response = await fetch(`${base}/users/${userId}/profiles/${profileId}/resume/download`, {
      credentials: "omit",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.status === 401) {
      setAdminToken(null);
      window.dispatchEvent(new Event("admin:unauthorized"));
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Unable to download resume.");
    }
    return response.blob();
  },
  userPayments: (id: number, page: number) => request<{
    payments: { id: number; amount: number; network: "erc20" | "bep20" | null; txHash: string | null; status: string | null; createdAt: string }[];
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
  bonusPlans: () => request<{ bonusPlans: BonusPlan[] }>("/bonus-plans"),
  createBonusPlan: (payload: BonusPlanPayload) =>
    request<{ bonusPlan: BonusPlan }>("/bonus-plans", { method: "POST", body: JSON.stringify(payload) }),
  updateBonusPlan: (id: number, payload: BonusPlanPayload) =>
    request<{ bonusPlan: BonusPlan }>(`/bonus-plans/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBonusPlan: (id: number) =>
    request<{ deleted: boolean }>(`/bonus-plans/${id}`, { method: "DELETE" }),
  apiKeys: () => request<{ apiKeys: ManagedApiKey[] }>("/api-keys"),
  createApiKey: (key: string, value: string) =>
    request<{ apiKey: ManagedApiKey }>("/api-keys", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    }),
  updateApiKey: (key: string, value: string) =>
    request<{ apiKey: ManagedApiKey }>(`/api-keys/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
  deleteApiKey: (key: string) =>
    request<{ apiKey: ManagedApiKey }>(`/api-keys/${encodeURIComponent(key)}`, { method: "DELETE" }),
  emailTemplates: () =>
    request<{ emailTemplates: EmailTemplate[] }>("/email-templates"),
  faqs: () => request<{ faqs: ManagedFaq[] }>("/faqs"),
  createFaq: (payload: Omit<ManagedFaq, "id" | "dateTime">) =>
    request<{ faq: ManagedFaq }>("/faqs", { method: "POST", body: JSON.stringify(payload) }),
  updateFaq: (id: number, payload: Omit<ManagedFaq, "id" | "dateTime">) =>
    request<{ faq: ManagedFaq }>(`/faqs/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteFaq: (id: number) => request<{ deleted: boolean }>(`/faqs/${id}`, { method: "DELETE" }),
  helpContent: (scope: "public" | "private") => request<{ content: string; updatedAt: string | null }>(`/help-content?scope=${scope}`),
  updateHelpContent: (scope: "public" | "private", content: string) =>
    request<{ content: string; updatedAt: string }>("/help-content", { method: "PUT", body: JSON.stringify({ scope, content }) }),
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

export interface SupportMessage {
  id: number;
  userId: number;
  adminUserId: number | null;
  category: "payment" | "bug" | "feedback" | "other";
  title: string;
  content: string;
  attachments: { storageKey: string; fileName: string; mimeType: string; size: number }[];
  dateTime: string;
  isRead: boolean;
  replyId: number | null;
  userName: string | null;
  userEmail: string | null;
}
