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
}
export type ApplicationSitePayload = Omit<ApplicationSite, "id">;
export type CrawlerMode = "headless" | "headed" | "chrome-ext";
export interface CrawlerType { id:number; name:string; url:string; mode:CrawlerMode; config:unknown; _count:{crawlers:number} }
export interface BotRun { logFilePath:string|null; id:string; status:string; startedAt:string|null; finishedAt:string|null; inserted:number; ignored:number; duplicated:number }
export interface Crawler { id:number; name:string; status:CrawlerStatus; active:boolean; queuedAt:string|null; lastRunAt:string|null; config:unknown; crawlerType:{id:number;name:string}; latestRun:BotRun|null; botRuns?:BotRun[]; _count:{botRuns:number} }
export interface CreateCrawlerPayload { name:string; crawlerTypeId:number; config:{ email:string; password:string; matchScoreMin?:number; url?:string; searchQuery?:string } }
export interface UpdateCrawlerPayload { name?:string; active?:boolean; config?:unknown }
export interface CrawlerTypePayload { name:string; url:string; mode:CrawlerMode; config:unknown }
export interface User { id:number; name:string|null; username:string; email:string|null; emailVerified:boolean; credit:number; status:"active"|"inactive"|"suspended"; createdAt:string; updatedAt:string; _count?:{profiles?:number;applications?:number} }
export interface ServiceHealth { id:string; name:string; running:boolean; checkedAt:string }
export interface FailedApplication {
  id: number; status: string; message: string | null; createdAt: string; updatedAt: string;
  previewScreenshot: string | null; resultScreenshot: string | null;
  job?: { id: number; positionName: string | null; companyName: string | null; applicationSite: { typeName: string } | null; url: string } | null;
  user?: { id: number; name: string | null; username: string } | null;
  profile?: { id: number; name: string | null } | null;
}
export type ApplicationStatus = "queued" | "applying" | "applied" | "failed";
export interface AdminApplication {
  id: number; status: ApplicationStatus; message: string | null;
  createdAt: string; updatedAt: string; appliedAt: string | null;
  previewScreenshot: string | null; resultScreenshot: string | null;
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
export interface EmailTemplateParameter { name:string; default?:string }
export interface EmailTemplate { id:number; name:string; fromName:string; fromEmailId:string; title:string; body:string; parameters:EmailTemplateParameter[] }
export type EmailTemplatePayload = Omit<EmailTemplate, "id">
export interface AdminUser { id:number; email:string; name:string|null; role:string }
export interface ProviderBalance {
  provider: "deepseek" | "openai" | "2captcha";
  amount: number | null;
  currency: string;
  error?: string;
  updatedAt: string;
}
