import { CrawlerFleetPage } from "../../crawlers/CrawlerFleetPage";

/** Companies > Company crawlers: the jobgether / jobright / simplify / tsenta accounts
 * (company_crawlers) that fill the companies table. Listed, created, run and toggled like the job
 * crawlers of Crawlers > Crawler fleet, through the admin API's /company-crawlers. */
export function CompanyCrawlersPage() {
  return <CrawlerFleetPage kind="company" />;
}
