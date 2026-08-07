export type CrawlerStatus = "idle" | "running" | "cleaning";
export interface Crawler { id:number; status:CrawlerStatus; active:boolean; config:unknown; crawlerType:{id:number;name:string}; latestRun:{id:string;status:string;requestedAt:string;startedAt:string|null;finishedAt:string|null}|null; _count:{botRuns:number;jobBoardCleanTasks:number} }
export interface User { id:string; username:string; role:string; status:string; createdAt:string; updatedAt:string; _count:{profiles:number;applications:number} }
