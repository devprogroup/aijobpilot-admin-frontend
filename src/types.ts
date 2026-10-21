export type CrawlerStatus = "idle" | "queued" | "running";
export interface ApplicationSite {
  id: number;
  typeName: string;
  displayText: string;
  domainRegex: string;
  active: boolean;
  newContextRequired: boolean;
  mode: "headless" | "headed" | "chrome-extension";
  fieldInputGapMs: number;
  submitDelayMs: number;
  pageTimeout: number;
  config: Record<string, unknown>;
  /** Cooldown in seconds between picks for sites that block back-to-back applications (null/0 = none). */
  sleepPeriod?: number | null;
  /** Nothing is picked for this site before this time (set to now + sleepPeriod on each pick). */
  wakeUpAt?: string | null;
}
export type ApplicationSitePayload = Omit<ApplicationSite, "id" | "sleepPeriod" | "wakeUpAt">;
export type CrawlerParameterControlType = "input" | "textarea" | "single-select" | "multi-select";
export interface CrawlerTypeParameterOption { key:string; value:string }
export interface CrawlerTypeParameter { controlType:CrawlerParameterControlType; options?:CrawlerTypeParameterOption[] }
export interface CrawlerType { id:number; name:string; config:unknown; parameters:Record<string,CrawlerTypeParameter>; _count:{crawlers:number} }
export interface CrawlerRunCounts { queued:number; inserted:number; ignored:number; duplicated:number; failed:number }
export interface CrawlerRun { logFilePath:string|null; id:string; status:string; startedAt:string|null; finishedAt:string|null; counts:CrawlerRunCounts }
export interface Crawler { id:number; name:string; status:CrawlerStatus; active:boolean; queuedAt:string|null; lastRunAt:string|null; config:unknown; stopSignalData:string|null; crawlerType:{id:number;name:string}; latestRun:CrawlerRun|null; crawlerRuns?:CrawlerRun[]; _count:{crawlerRuns:number} }
export interface CrawledJobRow { id:number; createdAt:string; title:string; company:string; status:string; crawlerName:string; crawlerType:string }
export interface CreateCrawlerPayload { name:string; crawlerTypeId:number; config:Record<string,unknown>; stopSignalData?:string }
export interface UpdateCrawlerPayload { name?:string; active?:boolean; config?:unknown; stopSignalData?:string|null }
export interface CrawlerTypePayload { name:string; config:unknown; parameters:Record<string,CrawlerTypeParameter> }
export interface User { id:number; name:string|null; username:string; email:string|null; emailVerified:boolean; credit:number; status:"active"|"inactive"|"suspended"; createdAt:string; updatedAt:string; /** Not-deleted profiles, list endpoint only. */ profileIds?:number[]; _count?:{profiles?:number;applications?:number} }
export interface ServiceHealth { id:string; name:string; running:boolean; checkedAt:string }
export interface SystemMetrics {
  cpu: { percent: number | null; cores: number };
  memory: { usedBytes: number; totalBytes: number };
  network: { receivedBytesPerSecond: number; sentBytesPerSecond: number } | null;
  storage: { usedBytes: number; totalBytes: number };
  sampledAt: string;
}
export interface CleanupReport {
  jobs: { removed: number; retentionDays: number } | null;
  files: { removedTempDateFolders: number; removedLogDateFolders: number; logRetentionDays: number } | null;
  errors: string[];
}
export type MaintenanceService = "client" | "client-service" | "ats-engine" | "crawler" | "application-worker";
export type MaintenanceStatus = "scheduled" | "ready" | "started" | "finished";
export interface MaintenanceEntry {
  id: number;
  label: string;
  scheduledAt: string;
  expectedDuration: number;
  startedAt: string | null;
  finishedAt: string | null;
  description: string | null;
  services: MaintenanceService[];
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
}
export type MaintenancePayload = Pick<MaintenanceEntry, "label" | "scheduledAt" | "expectedDuration" | "description" | "services">;
  export type ApplicationStatus = "queued" | "applying" | "applied" | "failed" | "closed" | "shortlisted" | "declined";
export interface AdminApplication {
  id: number; status: ApplicationStatus; message: string | null;
  /** "auto" = picked by the bot, "manual" = queued by the user. */
  source: "auto" | "manual";
  createdAt: string; updatedAt: string; appliedAt: string | null;
  previewScreenshot: string | null; resultScreenshot: string | null; logFilePath: string | null;
  job?: { id: number; positionName: string | null; companyName: string | null; url: string; applicationSite: { id: number; typeName: string; displayText: string } | null } | null;
  user?: { id: number; name: string | null; username: string } | null;
  profile?: { id: number; name: string | null } | null;
}
export interface ApplicationFilters {
  search?: string; from?: string; to?: string; status?: ApplicationStatus;
  applicationSiteId?: number; userId?: number; profileId?: number;
}
export interface UserDetails {
  user: User;
  profiles: { id:number; name:string|null; email:string|null; status:string; lastApplicationAt:string|null }[];
  applications: { id:number; status:string; createdAt:string; appliedAt:string|null; message:string|null; job?:{id:number;positionName:string|null;companyName:string|null}; profile?:{id:number;name:string|null} }[];
}
export interface AppConfig { key:string; value:string; updatedAt:string }
export interface AdminProfileDetails {
  id: number; userId: number; name: string | null; email: string | null; phone: string | null;
  location: { city: string; state: string; country: string } | null;
  linkedin: string | null; dateOfBirth: string | null; status: string;
  createdAt: string; updatedAt: string; lastApplicationAt: string | null;
  needResumeTailor: boolean; applicationLimit: number | null;
  applicationTimeWindows: { timezone: string; windows: { start: string; end: string }[] } | null;
  resumeData: unknown; atsData: unknown; workAuthorization: unknown; eeo: unknown;
  additionalInfo: unknown; applicationAnswers: unknown; savedSearch: unknown; botSearch: unknown;
  taxonomies: string[] | null;
}
/** A confirmed top-up of at least minTopup USDT is credited at amount x bonusRate. */
export interface BonusPlan { id:number; minTopup:number; bonusRate:number; active:boolean; createdAt:string; updatedAt:string }
export type BonusPlanPayload = Pick<BonusPlan, "minTopup" | "bonusRate" | "active">
export interface ManagedApiKey { key:string; configured:boolean; displayValue?:string|null; updatedAt?:string|null }
export interface EmailTemplateParameter { name:string; default?:string }
export interface EmailTemplate { id:number; name:string; fromName:string; fromEmailId:string; title:string; body:string; parameters:EmailTemplateParameter[] }
export type EmailTemplatePayload = Omit<EmailTemplate, "id">
export type FaqScope = "public" | "private" | null;
export interface ManagedFaq { id: number; question: string; answer: string; scope: FaqScope; sortOrder: number; isActive: boolean; dateTime: string }
export type AdminUserRole = "super_admin" | "support" | "technical";
export interface AdminUser { id:number; email:string; name:string|null; role:AdminUserRole; status:"active"|"inactive"; promocodeBalance:number; createdAt:string }
export type EmailStatusFilter = "all" | "available" | "consumed" | "expired";
export interface AdminEmailSummary {
  id: number;
  fromAddress: string;
  toAddress: string;
  subject: string;
  receivedAt: string;
  consumedAt: string | null;
  expiresAt: string;
}
export interface AdminEmail extends AdminEmailSummary {
  messageId: string;
  bodyText: string | null;
  bodyHtml: string | null;
}
export interface InboundEmailSummary extends AdminEmailSummary {
  profileId: number;
  messageId: string;
}
export interface InboundEmail extends InboundEmailSummary {
  bodyText: string | null;
  bodyHtml: string | null;
}
export interface PromoCode {
  id: number;
  code: string;
  createdAt: string;
  createdBy: number;
  createdByEmail: string | null;
  usedBy: number | null;
  usedAt: string | null;
  expiresAt: string;
  status: "active" | "used" | "expired";
}
export interface ProviderBalance {
  provider: "deepseek" | "openai" | "2captcha";
  amount: number | null;
  currency: string;
  error?: string;
  updatedAt: string;
}
export type PaymentNetwork = "erc20" | "bep20";
export interface AdminDepositAddress {
  id: number;
  address: string;
  usdtBalance: number;
  balanceUpdatedAt: string | null;
  lease: { userId: number; userName: string | null; userEmail: string | null; status: string; expiresAt: string } | null;
  lastPayment: { amount: number; txHash: string; createdAt: string; fromAddress: string | null; network: PaymentNetwork } | null;
  reservedUntil: string | null;
  createdAt: string;
}
