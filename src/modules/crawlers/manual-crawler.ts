import type { Crawler } from "../../types";

/** The built-in crawler that manual crawled-job uploads are attributed to (admin-backend
 * creates it with this type). It never runs, so it has no Run/Start button or enable toggle. */
export const MANUAL_CRAWLER_TYPE_NAME = "manual";

export function isManualCrawler(crawler: Pick<Crawler, "crawlerType">): boolean {
  return crawler.crawlerType?.name === MANUAL_CRAWLER_TYPE_NAME;
}
