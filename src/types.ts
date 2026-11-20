export type CrawlerStatus = "idle" | "queued" | "running";
export interface ApplicationSite {
  id: number;
  typeName: string;
  displayText: string;
  domainRegex: string;
  active: boolean;
  newContextRequired: boolean;
  /** A different IP (VPN server) for every application; only on a server with VPN_ENDPOINTS (prod). */
  rotateIp: boolean;
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
/** defaultValue: preset value; showWhen: only shown (and required) while those parameters have these values. */
export interface CrawlerTypeParameter { controlType:CrawlerParameterControlType; options?:CrawlerTypeParameterOption[]; defaultValue?:string; showWhen?:Record<string,string> }
/** A company crawler type (jobgether, jobright, simplify, tsenta): the settings its crawlers must set. */
export interface CrawlerType { id:number; name:string; config:Record<string,unknown>; parameters:Record<string,CrawlerTypeParameter>; _count:{crawlers:number} }
export interface CrawlerRunCounts { queued:number; inserted:number; ignored:number; duplicated:number; failed:number }
/** One manual upload of crawled jobs (a run of the "Manual upload" crawler): total = its jobs. */
export interface ManualUpload { id:number; uploadedAt:string|null; total:number; counts:CrawlerRunCounts }
/** titleFiltered: jobs the run's title filter dropped; units: companies / boards / sites handled out of
 * the run's total (both from its log; crawler list only, null for non-API crawlers). */
/** companies: a company crawler run's processed jobs and distinct companies it ingested (from its log;
 * crawler list only, null for job crawlers and older runs). */
export interface CrawlerRun { logFilePath:string|null; id:string; status:string; startedAt:string|null; finishedAt:string|null; counts:CrawlerRunCounts; titleFiltered?:number|null; units?:{ done:number; total:number|null }|null; companies?:{ jobs:number; companies:number }|null }
/** One handled company / board / site of a crawler run (newest first in CrawlerRunProgress.recent). */
export interface CrawlerRunActivity { at:string|null; level:string; event:string; unit:string|null; published:number|null; filtered:number|null; total:number|null; message:string|null }
/** How far a crawler run got, read from its log. total: companies / boards / sites the run set out to crawl. */
export interface CrawlerRunProgress { crawler:string|null; startedAt:string|null; lastEventAt:string|null; total:number|null; done:number; crawled:number; skipped:number; failed:number; published:number; filtered:number; current:string|null; summary:Record<string,unknown>|null; finish:{ status:string|null; errorMessage:string|null }|null; recent:CrawlerRunActivity[] }
/** "job": publishes jobs (workable, api-*, manual; /crawlers). "company": only fills the companies
 * table (jobgether, jobright, simplify, tsenta; /company-crawlers). Ids are per kind. */
export type CrawlerKind = "job" | "company";
/** type: a job crawler's type name; crawlerType: a company crawler's crawler type. */
export interface Crawler { id:number; kind:CrawlerKind; name:string; status:CrawlerStatus; active:boolean; queuedAt:string|null; lastRunAt:string|null; config:unknown; stopSignalData:string|null; type?:string; crawlerType?:{id:number;name:string}; latestRun:CrawlerRun|null; crawlerRuns?:CrawlerRun[]; _count:{crawlerRuns:number} }
/** companies row: board/boardId split from tenant ("greenhouse/acme"); logo is a /imgs/<file> path. */
export interface AdminCompany { id:number; tenant:string; board:string; boardId:string; name:string|null; url:string|null; logo:string|null; jobCount:number; createdAt:string|null; updatedAt:string|null }
export interface CompanyBoard { board:string; companies:number; unnamed:number }
export interface CompanyJob { id:number; url:string; positionName:string|null; companyName:string|null; createdAt:string }
/** logo: an image URL to download, the current /imgs/<file> path, or blank to clear. */
export interface CompanyPayload { name?:string|null; url?:string|null; logo?:string|null }
export interface Pagination { page:number; pageSize:number; total:number; totalPages:number }
export interface CrawledJobRow { id:number; createdAt:string; title:string; company:string; status:string; crawlerName:string; crawlerType:string }
export type CreateCrawlerPayload =
  | { kind:"company"; name:string; crawlerTypeId:number; config:Record<string,unknown>; stopSignalData?:string }
  | { kind:"job"; name:string; type:string; config:Record<string,unknown>; stopSignalData?:string };
export interface UpdateCrawlerPayload { name?:string; active?:boolean; config?:unknown; stopSignalData?:string|null }
export interface CrawlerTypePayload { name:string; config:Record<string,unknown>; parameters:Record<string,CrawlerTypeParameter> }
export interface User { id:number; name:string|null; username:string; email:string|null; emailVerified:boolean; credit:number; status:"active"|"inactive"|"suspended"; /** Internal / premium accounts may sign in to the internal platform. */ isInternal:boolean; isPremium:boolean; createdAt:string; updatedAt:string; /** Not-deleted profiles, list endpoint only. */ profileIds?:number[]; /** Not-deleted profiles with status "active", list endpoint only. */ activeProfileIds?:number[]; /** Newest sign-in or activity event, list endpoint only. */ lastAccess?:UserLastAccess|null; /** Newest device fingerprint, list endpoint only. */ lastFingerprint?:UserLastFingerprint|null; _count?:{profiles?:number;applications?:number} }
/** A client's most recent access event (client-backend user_access_events). */
export interface UserLastAccess { at:string; event:string; ip:string|null; country:string|null; region:string|null; city:string|null; browser:string|null; os:string|null; deviceType:string|null; device:string|null; /** Other accounts seen on this IP in the last 90 days. */ otherAccounts:number; /** IPs of this client in the last 90 days. */ ipCount:number }
/** A client's most recently seen device fingerprint. otherAccounts: accounts sharing it; count: this client's fingerprints. */
export interface UserLastFingerprint { visitorId:string; at:string; firstSeen:string; confidence:number|null; details:FingerprintDetails; ip:string|null; country:string|null; region:string|null; city:string|null; browser:string|null; os:string|null; deviceType:string|null; device:string|null; seenCount:number; otherAccounts:number; count:number }
/** The signals behind a device fingerprint, as the client app reported them. */
export interface FingerprintDetails { timezone?:string|null; locale?:string|null; languages?:string|null; screen?:string|null; colorDepth?:number|null; pixelRatio?:number|null; cores?:number|null; memoryGb?:number|null; platform?:string|null; gpuVendor?:string|null; gpuRenderer?:string|null; touchPoints?:number|null; fontCount?:number|null }
/** One sign-up, sign-in (or failed one), password change or throttled activity of a client. ipSource: how the IP was found (cloudflare, cloudflare_unverified, proxy, socket). */
export interface UserAccessEvent { id:number; event:string; detail:string|null; ip:string|null; ipSource:string|null; forwardedFor:string|null; userAgent:string|null; browser:string|null; os:string|null; deviceType:string|null; device:string|null; country:string|null; region:string|null; city:string|null; createdAt:string }
/** A client's access history page plus its IPs (with other accounts seen on them) and devices over summaryDays. */
export interface UserAccessHistory { events:UserAccessEvent[]; total:number; page:number; pageSize:number; summaryDays:number;
  summary:{ lastSeen:string|null; lastLogin:string|null; failedLogins:number; ipCount:number; countryCount:number; first:{ event:string; at:string; ip:string|null; country:string|null; region:string|null; city:string|null; browser:string|null; os:string|null; deviceType:string|null }|null };
  fingerprints:{ visitorId:string; confidence:number|null; details:FingerprintDetails; ip:string|null; country:string|null; region:string|null; city:string|null; userAgent:string|null; browser:string|null; os:string|null; deviceType:string|null; device:string|null; seenCount:number; firstSeen:string; lastSeen:string; otherUsers:{ id:number; name:string|null; email:string|null }[] }[];
  ips:{ ip:string; country:string|null; region:string|null; city:string|null; events:number; firstSeen:string; lastSeen:string; otherUsers:{ id:number; name:string|null; email:string|null }[] }[];
  devices:{ browser:string|null; os:string|null; deviceType:string|null; device:string|null; events:number; ips:number; firstSeen:string; lastSeen:string }[] }
/** Dashboard: status counts for applications created in the range, plus the live queue. */
/** running: the applications in progress now, longest-running first (startedAt = when the run claimed it). */
export interface RunningApplication { id: number; site: string; company: string; position: string; claimedBy: string | null; startedAt: string }
/** failedBySite: the range's failed applications per site, most first (the Failed tile's hover). */
export interface SiteStatusCount { site: string; status: string; count: number; /** Failed rows only: how many of count wait on the customer (action required). */ needsUser?: number }
/** One profile's applications of one status; profileId null for rows without a profile. */
export interface ProfileStatusCount { profileId: number | null; profile: string; user: string; status: string; count: number; /** Failed rows only: how many of count wait on the customer (action required). */ needsUser?: number }
/** bySite / byProfile: the range's applications per site (per profile) and status; liveBySite /
 * liveByProfile: the live queue (queued / applying) the same way. failedNeedingUser: of
 * byStatus.failed, the rows waiting on the customer (action required) rather than on the bot. */
export interface ApplicationStatusSummary { byStatus: Partial<Record<string, number>>; failedNeedingUser?: number; queued: number; applying: number; running?: RunningApplication[]; failedBySite?: { site: string; count: number }[]; bySite?: SiteStatusCount[]; liveBySite?: SiteStatusCount[]; byProfile?: ProfileStatusCount[]; liveByProfile?: ProfileStatusCount[] }
/** Jobs of the crawler runs started in a range: crawled = all of them; inserted = new jobs stored,
 * duplicated = already stored, ignored = skipped (unsupported / closed / unparseable), failed =
 * fetch failed after retries, queued = still waiting in ats-engine. */
export interface CrawlerSummaryCounts { runs: number; runningRuns: number; failedRuns: number; crawled: number; queued: number; inserted: number; ignored: number; duplicated: number; failed: number }
/** running: runs in progress now (whenever they started), units = companies handled / total from the run's log. */
export interface CrawlerSummary {
  total: CrawlerSummaryCounts;
  byCrawler: (CrawlerSummaryCounts & { crawler: string })[];
  running?: { crawler: string; startedAt: string | null; units: { done: number; total: number | null } | null }[];
  /** ats-engine now: jobs in progress (one per busy site) and each site's queued crawled jobs; null if it didn't answer. */
  atsEngine?: { processing: number; sites: { site: string; running: number; waiting: number }[] } | null;
}
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
  job?: { id: number; positionName: string | null; companyName: string | null; url: string; company?: { id: number; name: string | null; logo: string | null } | null; applicationSite: { id: number; typeName: string; displayText: string } | null } | null;
  user?: { id: number; name: string | null; username: string } | null;
  profile?: { id: number; name: string | null } | null;
}
export interface ApplicationFilters {
  search?: string; from?: string; to?: string; status?: ApplicationStatus;
  applicationSiteId?: number; userId?: number; profileId?: number;
  id?: string; job?: string; company?: string; source?: AdminApplication["source"];
  appliedFrom?: string; appliedTo?: string;
  sortBy?: ApplicationSortKey; sortDir?: "asc" | "desc";
}
export type ApplicationSortKey = "id" | "status" | "job" | "company" | "site" | "source" | "user" | "profile" | "createdAt" | "appliedAt";
export interface ApplicationFilterUser { id: number; name: string | null; username: string; email: string | null }
export interface ApplicationFilterProfile { id: number; name: string | null; isDeleted: boolean }
/** The client's own prompt rules; null means the default is used. */
export interface UserCustomPrompts {
  resumeTailorRules: string | null;
  resumeTailorRulesTokens: number | null;
  coverLetterRules: string | null;
  answerRules: string | null;
}

export type UrlSubmissionFileKind = "source" | "total" | "auto-applicable" | "unsupported" | "invalid";

export interface UserUrlSubmission {
  id: number;
  fileName: string | null;
  status: "raw" | "queued" | "parsing" | "parsed";
  totalCount: number;
  autoApplicableCount: number;
  unsupportedCount: number;
  invalidCount: number;
  createdAt: string;
  parsedAt: string | null;
}

export interface UserDetails {
  user: User;
  profiles: { id:number; name:string|null; email:string|null; status:string; lastApplicationAt:string|null }[];
}
export interface AppConfig { key:string; value:string; updatedAt:string }
/** Settings > Models (admin-backend routes/llm-models.ts; the catalog is packages/db llm-config.ts). */
export type LlmProvider = "deepseek" | "openai" | "anthropic";
export interface LlmModelOption { id: string; label: string; efforts: string[]; defaultEffort: string; note?: string }
export interface LlmProviderOption { id: LlmProvider; label: string; credentialKey: string; credentialConfigured: boolean; models: LlmModelOption[] }
export interface LlmUseCaseConfig { provider: LlmProvider; model: string; effort: string; textEffort?: string }
export interface LlmUseCaseRow { id: string; key: string; label: string; description: string; textEffortLabel: string | null; config: LlmUseCaseConfig; updatedAt: string | null }
export interface LlmModelsResponse { providers: LlmProviderOption[]; effortLabels: Record<string, string>; useCases: LlmUseCaseRow[] }
export interface AdminProfileDetails {
  resumeFileName: string | null;
  id: number; userId: number; name: string | null; email: string | null; phone: string | null;
  location: { city: string; state: string; country: string } | null;
  linkedin: string | null; dateOfBirth: string | null; status: string;
  createdAt: string; updatedAt: string; lastApplicationAt: string | null;
  needResumeTailor: boolean; applicationLimit: number | null;
  /** `days` (mon…sun, judged in `timezone`) left out means every day. */
  applicationTimeWindows: { timezone: string; windows: { start: string; end: string }[]; days?: string[] } | null;
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
export type ClientMailingRecipients = "all" | number[];
export interface ClientMailingPayload { recipients: ClientMailingRecipients; fromName: string; fromEmailId: string; subject: string; body: string }
export interface ClientMailingResult { recipients: number; sent: number; failed: number; skipped: number; errors: string[] }
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
  /** Only returned to technical and super admins. */
  usedByEmail: string | null;
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

/** What a client or profile hard delete removed (admin-backend services/client-deletion.ts). */
export type ClientDeletionResult = {
  profiles: number;
  applications: number;
  matches: number;
  privateJobs: number;
  files: number;
};
