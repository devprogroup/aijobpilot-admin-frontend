import type { Crawler } from "../../types";

/** The built-in crawler that manual crawled-job uploads are attributed to (admin-backend
 * creates it with this type). It never runs, so it has no Run/Start button or enable toggle. */
export const MANUAL_CRAWLER_TYPE_NAME = "manual";

/** A crawler's type name: a job crawler's own type, a company crawler's crawler type. */
export function crawlerTypeName(crawler: Pick<Crawler, "kind" | "type" | "crawlerType">): string {
  return (crawler.kind === "company" ? crawler.crawlerType?.name : crawler.type) ?? "";
}

/** The list page of a kind: job crawlers in Crawlers > Crawler fleet, company crawlers in
 * Companies > Company crawlers (modules/companies/crawlers). */
export function crawlerListPath(kind: Crawler["kind"]): string {
  return kind === "company" ? "/companies/crawlers" : "/crawlers/fleets";
}

/** The crawler's details page (ids are per kind). */
export function crawlerPath(crawler: Pick<Crawler, "kind" | "id">): string {
  return `${crawlerListPath(crawler.kind)}/${crawler.id}`;
}

export function isManualCrawler(crawler: Pick<Crawler, "kind" | "type">): boolean {
  return crawler.kind === "job" && crawler.type === MANUAL_CRAWLER_TYPE_NAME;
}
