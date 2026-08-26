export type CrawlerStatus = "idle" | "queued" | "running";
export interface CrawlerType { id:number; name:string; url:string; config:unknown; _count:{crawlers:number} }
export interface BotRun { id:string; status:string; startedAt:string|null; finishedAt:string|null; inserted:number; ignored:number; duplicated:number }
export interface Crawler { id:number; name:string; status:CrawlerStatus; active:boolean; queuedAt:string|null; lastRunAt:string|null; config:unknown; crawlerType:{id:number;name:string}; latestRun:BotRun|null; botRuns?:BotRun[]; _count:{botRuns:number} }
export interface CreateCrawlerPayload { name:string; crawlerTypeId:number; config:{ email:string; password:string; matchScoreMin?:number; url?:string; searchQuery?:string } }
export interface UpdateCrawlerPayload { name?:string; active?:boolean; config?:unknown }
export interface CrawlerTypePayload { name:string; url:string; config:unknown }
export interface User { id:string; name:string|null; username:string; credit:number; freeCredit:number; role:string; status:string; createdAt:string; updatedAt:string; _count?:{profiles?:number;applications?:number} }
export interface ServiceHealth { id:string; name:string; running:boolean; checkedAt:string }
export interface AppConfig { key:string; value:string; updatedAt:string }
export interface EmailTemplateParameter { name:string; default?:string }
export interface EmailTemplate { id:number; name:string; title:string; body:string; parameters:EmailTemplateParameter[] }
export type EmailTemplatePayload = Omit<EmailTemplate, "id">
export interface AdminUser { id:number; email:string; name:string|null; role:string }
export interface ProviderBalance {
  provider: "deepseek" | "openai" | "2captcha";
  amount: number | null;
  currency: string;
  error?: string;
  updatedAt: string;
}
