export type CrawlerStatus = "idle" | "queued" | "running";
export interface CrawlerType { id:number; name:string; url:string; config:unknown; _count:{crawlers:number} }
export interface BotRun { id:string; status:string; requestedAt:string; startedAt:string|null; finishedAt:string|null; errorMessage?:string|null; resultSummary?:unknown }
export interface Crawler { id:number; name:string; status:CrawlerStatus; active:boolean; queuedAt:string|null; lastRunAt:string|null; config:unknown; crawlerType:{id:number;name:string}; latestRun:BotRun|null; botRuns?:BotRun[]; _count:{botRuns:number} }
export interface CreateCrawlerPayload { name:string; crawlerTypeId:number; config:{ email:string; password:string; matchScoreMin?:number; url?:string; searchQuery?:string } }
export interface UpdateCrawlerPayload { name?:string; active?:boolean; config?:unknown }
export interface CrawlerTypePayload { name:string; url:string; config:unknown }
export interface User { id:string; username:string; role:string; status:string; createdAt:string; updatedAt:string; _count?:{profiles?:number;applications?:number} }
