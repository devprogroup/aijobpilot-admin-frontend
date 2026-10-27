import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Box, Button, Flex, Grid, Icon, Spinner, Text } from "@chakra-ui/react";
import { AlertTriangle, Bot, ChevronDown, ChevronLeft, ChevronRight, Cpu, HardDrive, MemoryStick, Network, RefreshCw, Send, Server, Trash2, WalletCards } from "lucide-react";
import { api } from "../../api";
import type { AppConfig, ApplicationStatusSummary, CrawlerSummary, ProviderBalance, RunningApplication, ServiceHealth, SystemMetrics } from "../../types";
import { dateFilterRange, todayDateInput } from "../../services/date-filter";
import { Link } from "react-router-dom";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const serviceDefinitions = [
  { id: "redis", name: "Redis" },
  { id: "ats-engine", name: "ATS Engine" },
  { id: "crawler-backend", name: "Crawler Backend" },
  { id: "client-backend", name: "Client Backend" },
  { id: "application-backend", name: "Application Backend" },
] as const;

type SettlingStatus = {
  periods: [string, string][];
  multiplier: number | null;
  active: boolean;
  configured: boolean;
};

function isSettlingPeriodActive(periods: [string, string][], now = new Date()): boolean {
  const secondsNow = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  const seconds = (time: string) => {
    const [hours, minutes, secondsPart] = time.split(":").map(Number);
    return hours! * 3600 + minutes! * 60 + secondsPart!;
  };
  return periods.some(([from, to]) => {
    const start = seconds(from);
    const end = seconds(to);
    return start <= end ? secondsNow >= start && secondsNow < end : secondsNow >= start || secondsNow < end;
  });
}

function readSettlingStatus(settings: AppConfig[]): SettlingStatus {
  const values = new Map<string, string>(settings.map(({ key, value }) => [key, value] as const));
  let periods: [string, string][] = [];
  let validPeriods = false;
  try {
    const parsed: unknown = JSON.parse(values.get("SETTLING_PERIODS") ?? "");
    if (Array.isArray(parsed) && parsed.every((period) =>
      Array.isArray(period) && period.length === 2 &&
      [period[0], period[1]].every((time) => typeof time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)),
    )) {
      periods = parsed as [string, string][];
      validPeriods = true;
    }
  } catch {
    // The dashboard shows a configuration warning below.
  }
  const parsedMultiplier = Number(values.get("SETTLING_PERIOD_MULTIPLIER"));
  const validMultiplier = Number.isFinite(parsedMultiplier) && parsedMultiplier > 0;
  return {
    periods,
    multiplier: validMultiplier ? parsedMultiplier : null,
    active: isSettlingPeriodActive(periods),
    configured: validPeriods && validMultiplier,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(1)} ${unit}`;
}

function MetricCard({
  title,
  icon,
  value,
  detail,
  percent,
}: {
  title: string;
  icon: typeof Cpu;
  value: string;
  detail: string;
  percent?: number | null;
}) {
  return (
    <Box borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" p="5" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
      <Flex align="center" gap="3">
        <Flex h="10" w="10" align="center" justify="center" borderRadius="xl" bg="green.50" color="green.700">
          <Icon as={icon} boxSize="5" />
        </Flex>
        <Text fontSize="sm" fontWeight="semibold" color="gray.600">{title}</Text>
      </Flex>
      <Text mt="5" fontSize="2xl" fontWeight="bold" fontVariantNumeric="tabular-nums">{value}</Text>
      <Text mt="1" fontSize="xs" color="gray.500">{detail}</Text>
      {percent !== undefined && percent !== null && (
        <Box mt="4" h="1.5" overflow="hidden" borderRadius="full" bg="gray.100" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${title} usage`}>
          <Box h="full" w={`${Math.max(0, Math.min(100, percent))}%`} borderRadius="full" bg="green.500" transition="width 300ms" />
        </Box>
      )}
    </Box>
  );
}

/** Today's counts follow the Applications page's default filter (created today, admin's time zone). */
const applicationStatusTiles = [
  { key: "queued", label: "Queued", note: "Waiting now", color: "gray.700" },
  { key: "applying", label: "Applying", note: "Running now", color: "blue.600" },
  { key: "applied", label: "Applied", note: "Created today", color: "green.700" },
  { key: "failed", label: "Failed", note: "Created today", color: "red.600" },
  { key: "closed", label: "Closed", note: "Created today", color: "gray.500" },
  { key: "total", label: "Total", note: "Created today", color: "gray.700" },
] as const;

/** "12m 05s" / "1h 03m" for a run that started at `startedAt`. */
function elapsedSince(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** The Applying tile's "Running now"; hovering lists the applications in progress -- site, company
 * and how long each has run, longest first -- so a stuck one shows at a glance. The clock ticks
 * while the list is open; the list itself follows the dashboard's 15 s refresh. */
function ApplyingNow({ running, profiles }: { running: RunningApplication[]; profiles: BreakdownRow[] }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);
  if (running.length === 0) return <Text fontSize="xs" color="gray.400">Running now</Text>;
  return (
    <Box position="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Text as="span" fontSize="xs" color="blue.600" fontWeight="semibold" cursor="default" borderBottom="1px dotted" borderColor="blue.300">
        Running now
      </Text>
      {open && (
        <Box position="absolute" top="100%" left="0" mt="1" zIndex="10" minW="80" maxH="96" overflowY="auto" bg="white" borderRadius="lg" boxShadow="lg" border="1px solid" borderColor="gray.100" px="3" py="2">
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb="1">Applying now, longest first</Text>
          {running.map((run) => (
            <Flex key={run.id} justify="space-between" gap="4" py="0.5" fontSize="xs" whiteSpace="nowrap">
              <Text color="gray.800" overflow="hidden" textOverflow="ellipsis" maxW="72" title={`#${run.id} ${run.position}${run.claimedBy ? ` · ${run.claimedBy}` : ""}`}>
                <Text as="span" fontWeight="semibold">{run.site}</Text>
                {run.company && <Text as="span" color="gray.500"> · {run.company}</Text>}
              </Text>
              <Text color={now - new Date(run.startedAt).getTime() >= 15 * 60_000 ? "red.600" : "gray.500"} fontVariantNumeric="tabular-nums">
                {elapsedSince(run.startedAt, now)}
              </Text>
            </Flex>
          ))}
          {profiles.length > 0 && <BreakdownSection title="Applying by profile" rows={profiles} mt="2" />}
        </Box>
      )}
    </Box>
  );
}

/** One line of a tile's hover list: a site or a profile with its count. */
type BreakdownRow = { key: string; label: string; hint?: string; count: number };

/** A titled list of rows with counts; the hover title shows each row's share of the section. */
function BreakdownSection({ title, rows, mt }: { title: string; rows: BreakdownRow[]; mt?: string }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <Box mt={mt}>
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb="1">{title}</Text>
      {rows.map((row) => (
        <Flex key={row.key} justify="space-between" gap="4" py="0.5" fontSize="xs" whiteSpace="nowrap">
          <Text color="gray.800" overflow="hidden" textOverflow="ellipsis" maxW="64" title={row.hint ? `${row.label} · ${row.hint}` : row.label}>
            <Text as="span" fontWeight="semibold">{row.label}</Text>
            {row.hint && <Text as="span" color="gray.500"> · {row.hint}</Text>}
          </Text>
          <Text color="gray.500" fontVariantNumeric="tabular-nums" title={`${Math.round((row.count / total) * 100)}% of ${total.toLocaleString()}`}>{row.count.toLocaleString()}</Text>
        </Flex>
      ))}
    </Box>
  );
}

/** The profiles behind a tile's count, most first: the live queue for Queued and Applying, today's
 * rows of the tile's status otherwise, and every status together for Total. */
function profileCounts(summary: ApplicationStatusSummary | null, key: ApplicationTileKey): BreakdownRow[] {
  if (!summary) return [];
  const rows = key === "queued" || key === "applying"
    ? (summary.liveByProfile ?? []).filter((row) => row.status === key)
    : (summary.byProfile ?? []).filter((row) => key === "total" || row.status === key);
  const counts = new Map<string, BreakdownRow>();
  for (const row of rows) {
    const id = row.profileId == null ? "none" : String(row.profileId);
    const current = counts.get(id);
    if (current) current.count += row.count;
    else counts.set(id, { key: id, label: row.profile || (row.profileId == null ? "No profile" : `Profile #${row.profileId}`), hint: row.user || undefined, count: row.count });
  }
  return [...counts.values()].sort((left, right) => right.count - left.count);
}

type ApplicationTileKey = (typeof applicationStatusTiles)[number]["key"];

/** The sites behind a tile's count, most first: the live queue for Queued and Applying, today's
 * rows of the tile's status otherwise, and every status together for Total. */
function siteCounts(summary: ApplicationStatusSummary | null, key: ApplicationTileKey): { site: string; count: number }[] {
  if (!summary) return [];
  const rows = key === "queued" || key === "applying"
    ? (summary.liveBySite ?? []).filter((row) => row.status === key)
    : (summary.bySite ?? []).filter((row) => key === "total" || row.status === key);
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.site, (counts.get(row.site) ?? 0) + row.count);
  return [...counts].map(([site, count]) => ({ site, count })).sort((left, right) => right.count - left.count);
}

/** A tile's note; hovering lists the tile's count per profile and per site, most first. */
function CountBreakdown({ sections, note, color }: { sections: { title: string; rows: BreakdownRow[] }[]; note: string; color: string }) {
  const [open, setOpen] = useState(false);
  const shown = sections.filter((section) => section.rows.length > 0);
  if (shown.length === 0) return <Text fontSize="xs" color="gray.400">{note}</Text>;
  return (
    <Box position="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Text as="span" fontSize="xs" color={color} fontWeight="semibold" cursor="default" borderBottom="1px dotted" borderColor={color.replace(/\.\d+$/, ".300")}>
        {note}
      </Text>
      {open && (
        <Box position="absolute" top="100%" left="0" mt="1" zIndex="10" minW="64" maxH="96" overflowY="auto" bg="white" borderRadius="lg" boxShadow="lg" border="1px solid" borderColor="gray.100" px="3" py="2">
          {shown.map((section, index) => <BreakdownSection key={section.title} title={section.title} rows={section.rows} mt={index > 0 ? "2" : undefined} />)}
        </Box>
      )}
    </Box>
  );
}

function ApplicationStatusSection({ summary }: { summary: ApplicationStatusSummary | null }) {
  const today = summary?.byStatus ?? {};
  const value = (key: (typeof applicationStatusTiles)[number]["key"]) => {
    if (!summary) return null;
    if (key === "queued" || key === "applying") return summary[key];
    if (key === "total") return Object.values(today).reduce<number>((sum, count) => sum + (count ?? 0), 0);
    return today[key] ?? 0;
  };
  return (
    <Box mb="8" {...cardStyle}>
      <Flex align="center" justify="space-between" gap="3" mb="4">
        <Flex align="center" gap="3">
          <Flex h="10" w="10" align="center" justify="center" borderRadius="xl" bg="green.50" color="green.700">
            <Icon as={Send} boxSize="5" />
          </Flex>
          <Box>
            <Text fontWeight="bold">Applications</Text>
            <Text fontSize="xs" color="gray.400">Live queue and today's results</Text>
          </Box>
        </Flex>
        <Link to="/applications/all" style={{ textDecoration: "none" }}>
          <Button size="sm" variant="outline">View applications</Button>
        </Link>
      </Flex>
      <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" }} gap="3">
        {applicationStatusTiles.map((tile) => {
          const count = value(tile.key);
          return (
            <Box key={tile.key} borderRadius="xl" bg="gray.50" px="4" py="3">
              <Text fontSize="xs" fontWeight="semibold" color="gray.500">{tile.label}</Text>
              <Text fontSize="2xl" fontWeight="bold" color={tile.color} fontVariantNumeric="tabular-nums">
                {count === null ? "—" : count.toLocaleString()}
              </Text>
              {tile.key === "applying"
                ? <ApplyingNow running={summary?.running ?? []} profiles={profileCounts(summary, tile.key)} />
                : <CountBreakdown
                    note={tile.note}
                    color={tile.color}
                    sections={[
                      { title: `${tile.label} by profile`, rows: profileCounts(summary, tile.key) },
                      { title: `${tile.label} by site`, rows: siteCounts(summary, tile.key).map((row) => ({ key: row.site, label: row.site, count: row.count })) },
                    ]}
                  />}
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
}

/** Jobs of the crawler runs started today (admin's time zone) and what ats-engine made of them. */
const crawlerTiles = [
  { key: "crawled", label: "Crawled", note: "Jobs found by today's runs", color: "gray.700" },
  { key: "inserted", label: "Ingested", note: "New jobs stored", color: "green.700" },
  { key: "duplicated", label: "Duplicates", note: "Already stored", color: "gray.500" },
  { key: "ignored", label: "Skipped", note: "Unsupported, closed or unparseable", color: "orange.600" },
  { key: "failed", label: "Failed", note: "Fetch failed after retries", color: "red.600" },
  { key: "queued", label: "Waiting", note: "In the ATS queue", color: "blue.600" },
] as const;

const crawlerColumns = [
  ["crawled", "Crawled"],
  ["inserted", "Ingested"],
  ["duplicated", "Duplicates"],
  ["ignored", "Skipped"],
  ["failed", "Failed"],
  ["queued", "Waiting"],
] as const;

const CRAWLER_ROWS_PER_PAGE = 5;

/** "N processing now" under the ATS queue tile; hovering lists the sites ats-engine is working on
 * in parallel, how many jobs each is running and how many of each site's jobs are still waiting. */
function AtsEngineProcessing({ ats }: { ats: NonNullable<CrawlerSummary["atsEngine"]> }) {
  const [open, setOpen] = useState(false);
  const label = `${ats.processing.toLocaleString()} ${ats.processing === 1 ? "job" : "jobs"} processing now`;
  if (ats.sites.length === 0) return <Text mt="1" fontSize="xs" color="gray.500">{label}</Text>;
  return (
    <Box position="relative" mt="1" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Text as="span" fontSize="xs" color="blue.600" fontWeight="semibold" cursor="default" borderBottom="1px dotted" borderColor="blue.300">
        {label}
      </Text>
      {open && (
        <Box position="absolute" top="100%" right="0" mt="1" zIndex="10" minW="64" bg="white" borderRadius="lg" boxShadow="lg" border="1px solid" borderColor="gray.100" px="3" py="2">
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb="1">ats-engine sites in parallel</Text>
          {ats.sites.map(({ site, running, waiting }) => (
            <Flex key={site} justify="space-between" gap="4" py="0.5" fontSize="xs" whiteSpace="nowrap">
              <Text color="gray.800" fontWeight="semibold">{site} <Text as="span" color="blue.600">× {running}</Text></Text>
              <Text color="gray.500" fontVariantNumeric="tabular-nums">{waiting.toLocaleString()} waiting</Text>
            </Flex>
          ))}
        </Box>
      )}
    </Box>
  );
}

/** "N running now"; hovering lists the crawlers running in parallel and the companies each has handled. */
function RunningCrawlers({ running }: { running: NonNullable<CrawlerSummary["running"]> }) {
  const [open, setOpen] = useState(false);
  if (running.length === 0) return <>0 crawlers running now</>;
  return (
    <Box as="span" position="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Text as="span" color="blue.600" fontWeight="semibold" cursor="default" borderBottom="1px dotted" borderColor="blue.300">
        {running.length} {running.length === 1 ? "crawler" : "crawlers"} running now
      </Text>
      {open && (
        <Box position="absolute" top="100%" left="0" mt="1" zIndex="10" minW="64" bg="white" borderRadius="lg" boxShadow="lg" border="1px solid" borderColor="gray.100" px="3" py="2">
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb="1">Crawlers running in parallel</Text>
          {running.map((run) => (
            <Flex key={run.crawler} justify="space-between" gap="4" py="0.5" fontSize="xs" whiteSpace="nowrap">
              <Text color="gray.800" fontWeight="semibold">{run.crawler}</Text>
              <Text color="gray.500" fontVariantNumeric="tabular-nums">
                {run.units
                  ? `${run.units.done.toLocaleString()}${run.units.total !== null ? ` / ${run.units.total.toLocaleString()}` : ""} companies`
                  : run.startedAt ? `since ${new Date(run.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
              </Text>
            </Flex>
          ))}
        </Box>
      )}
    </Box>
  );
}

function CrawlerSummarySection({ summary }: { summary: CrawlerSummary | null }) {
  const total = summary?.total;
  const [tableOpen, setTableOpen] = useState(false);
  const [page, setPage] = useState(0);
  const rows = summary?.byCrawler ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / CRAWLER_ROWS_PER_PAGE));
  // The 15 s refresh can change how many crawlers ran today.
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(currentPage * CRAWLER_ROWS_PER_PAGE, (currentPage + 1) * CRAWLER_ROWS_PER_PAGE);
  return (
    <Box mb="8" {...cardStyle}>
      <Flex align="center" justify="space-between" gap="3" mb="4">
        <Flex align="center" gap="3">
          <Flex h="10" w="10" align="center" justify="center" borderRadius="xl" bg="green.50" color="green.700">
            <Icon as={Bot} boxSize="5" />
          </Flex>
          <Box>
            <Text fontWeight="bold">Crawlers</Text>
            <Text as="div" fontSize="xs" color="gray.400">
              {total ? (
                <>
                  {`${total.runs.toLocaleString()} runs started today · `}
                  <RunningCrawlers running={summary?.running ?? []} />
                  {` · ${total.failedRuns} failed`}
                </>
              ) : "Runs started today"}
            </Text>
          </Box>
        </Flex>
        <Link to="/crawlers/fleets" style={{ textDecoration: "none" }}>
          <Button size="sm" variant="outline">View crawlers</Button>
        </Link>
      </Flex>
      <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" }} gap="3">
        {crawlerTiles.map((tile) => (
          <Box key={tile.key} borderRadius="xl" bg="gray.50" px="4" py="3">
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">{tile.label}</Text>
            <Text fontSize="2xl" fontWeight="bold" color={tile.color} fontVariantNumeric="tabular-nums">
              {total ? total[tile.key].toLocaleString() : "—"}
            </Text>
            <Text fontSize="xs" color="gray.400">{tile.note}</Text>
            {tile.key === "queued" && summary?.atsEngine && <AtsEngineProcessing ats={summary.atsEngine} />}
          </Box>
        ))}
      </Grid>
      {rows.length > 0 && (
        <Button mt="4" size="sm" variant="ghost" color="gray.600" onClick={() => setTableOpen((open) => !open)} aria-expanded={tableOpen}>
          <Icon as={ChevronDown} boxSize="4" transform={tableOpen ? "rotate(180deg)" : undefined} transition="transform .2s" />
          {tableOpen ? "Hide" : "Show"} per-crawler breakdown ({rows.length})
        </Button>
      )}
      {tableOpen && rows.length > 0 && (
        <Box mt="2" overflowX="auto">
          <Box as="table" w="full" fontSize="sm" style={{ borderCollapse: "collapse" }}>
            <Box as="thead">
              <Box as="tr" color="gray.500" fontSize="xs" textAlign="right">
                <Box as="th" py="2" pr="3" textAlign="left" fontWeight="semibold">Crawler</Box>
                <Box as="th" py="2" px="3" fontWeight="semibold">Runs</Box>
                {crawlerColumns.map(([key, label]) => (
                  <Box as="th" key={key} py="2" px="3" fontWeight="semibold">{label}</Box>
                ))}
              </Box>
            </Box>
            <Box as="tbody">
              {pageRows.map((row) => (
                <Box as="tr" key={row.crawler} borderTop="1px solid" borderColor="gray.100" textAlign="right" fontVariantNumeric="tabular-nums">
                  <Box as="td" py="2" pr="3" textAlign="left" fontWeight="semibold" whiteSpace="nowrap">{row.crawler}</Box>
                  <Box as="td" py="2" px="3" color="gray.600" whiteSpace="nowrap">
                    {row.runs}
                    {row.runningRuns > 0 && <Text as="span" color="blue.600"> · {row.runningRuns} running</Text>}
                    {row.failedRuns > 0 && <Text as="span" color="red.600"> · {row.failedRuns} failed</Text>}
                  </Box>
                  {crawlerColumns.map(([key]) => (
                    <Box as="td" key={key} py="2" px="3" color={row[key] ? "gray.800" : "gray.300"}>{row[key].toLocaleString()}</Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
          {pageCount > 1 && (
            <Flex mt="3" align="center" justify="flex-end" gap="2">
              <Text fontSize="xs" color="gray.500" mr="1">
                {currentPage * CRAWLER_ROWS_PER_PAGE + 1}–{Math.min(rows.length, (currentPage + 1) * CRAWLER_ROWS_PER_PAGE)} of {rows.length}
              </Text>
              <Button size="xs" variant="outline" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0} aria-label="Previous crawlers">
                <Icon as={ChevronLeft} boxSize="4" />
              </Button>
              <Button size="xs" variant="outline" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1} aria-label="Next crawlers">
                <Icon as={ChevronRight} boxSize="4" />
              </Button>
            </Flex>
          )}
        </Box>
      )}
    </Box>
  );
}

function SystemMetricsSection({ metrics }: { metrics: SystemMetrics | null }) {
  const memoryPercent = metrics ? metrics.memory.usedBytes / metrics.memory.totalBytes * 100 : null;
  const storagePercent = metrics ? metrics.storage.usedBytes / metrics.storage.totalBytes * 100 : null;
  const networkDetail = metrics?.network
    ? `↓ ${formatBytes(metrics.network.receivedBytesPerSecond)}/s  ↑ ${formatBytes(metrics.network.sentBytesPerSecond)}/s`
    : "Sampling network traffic";
  return (
    <Box mb="8">
      <Flex mb="3" align="end" justify="space-between" gap="3">
        <Box>
          <Text fontWeight="bold">Resource usage</Text>
          <Text mt="1" fontSize="xs" color="gray.400">Host running the admin backend · updates every 15 seconds</Text>
        </Box>
        {metrics && <Text fontSize="xs" color="gray.400">Updated {new Date(metrics.sampledAt).toLocaleTimeString()}</Text>}
      </Flex>
      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap="4">
        <MetricCard title="CPU" icon={Cpu} value={metrics?.cpu.percent == null ? "—" : `${metrics.cpu.percent.toFixed(1)}%`} detail={metrics ? `${metrics.cpu.cores} logical cores` : "Waiting for sample"} percent={metrics?.cpu.percent} />
        <MetricCard title="Memory" icon={MemoryStick} value={metrics ? `${memoryPercent!.toFixed(1)}%` : "—"} detail={metrics ? `${formatBytes(metrics.memory.usedBytes)} of ${formatBytes(metrics.memory.totalBytes)}` : "Waiting for sample"} percent={memoryPercent} />
        <MetricCard title="Network" icon={Network} value={metrics?.network ? `${formatBytes(metrics.network.receivedBytesPerSecond + metrics.network.sentBytesPerSecond)}/s` : "—"} detail={networkDetail} />
        <MetricCard title="Storage" icon={HardDrive} value={metrics ? `${storagePercent!.toFixed(1)}%` : "—"} detail={metrics ? `${formatBytes(metrics.storage.usedBytes)} of ${formatBytes(metrics.storage.totalBytes)} · FILES_ROOT volume` : "Waiting for sample"} percent={storagePercent} />
      </Grid>
    </Box>
  );
}

const cardStyle = {
  borderRadius: "2xl",
  border: "1px solid",
  borderColor: "gray.200",
  bg: "white",
  p: "5",
  boxShadow: "0 12px 35px rgba(24, 43, 34, .07)",
} as const;

/** One row of the dashboard's status cards: a name with a note under it, and a value on the right. */
function StatusRow({ title, note, noteColor = "gray.400", children }: {
  title: string;
  note: string;
  noteColor?: string;
  children: ReactNode;
}) {
  return (
    <Flex align="center" justify="space-between" gap="3" py="3" borderTop="1px solid" borderColor="gray.100">
      <Box minW="0">
        <Text fontWeight="semibold">{title}</Text>
        <Text fontSize="xs" color={noteColor} title={note} lineClamp={1}>{note}</Text>
      </Box>
      <Flex flexShrink={0} align="center" gap="2">{children}</Flex>
    </Flex>
  );
}

const providerLabels: Record<ProviderBalance["provider"], string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  "2captcha": "2Captcha",
};

function BalanceRow({ provider, balance, loading }: {
  provider: ProviderBalance["provider"];
  balance: ProviderBalance | null;
  loading: boolean;
}) {
  return (
    <StatusRow
      title={providerLabels[provider]}
      note={balance?.error || (balance ? `Checked ${new Date(balance.updatedAt).toLocaleTimeString()}` : "Loading balance...")}
      noteColor={balance?.error ? "red.600" : "gray.400"}
    >
      {loading && <Spinner size="xs" color="gray.400" />}
      <Text fontSize="xl" fontWeight="bold" fontVariantNumeric="tabular-nums">
        {balance?.amount == null ? "—" : money.format(balance.amount)}
      </Text>
    </StatusRow>
  );
}

export function DashboardPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [serviceLoading, setServiceLoading] = useState<Record<string, boolean>>(
    Object.fromEntries(serviceDefinitions.map(({ id }) => [id, true])),
  );
  const [deepSeekLoading, setDeepSeekLoading] = useState(true);
  const [openAiLoading, setOpenAiLoading] = useState(true);
  const [twoCaptchaLoading, setTwoCaptchaLoading] = useState(true);
  const [deepSeekBalance, setDeepSeekBalance] =
    useState<ProviderBalance | null>(null);
  const [openAiBalance, setOpenAiBalance] = useState<ProviderBalance | null>(
    null,
  );
  const [twoCaptchaBalance, setTwoCaptchaBalance] =
    useState<ProviderBalance | null>(null);
  const [applicationSummary, setApplicationSummary] = useState<ApplicationStatusSummary | null>(null);
  const [crawlerSummary, setCrawlerSummary] = useState<CrawlerSummary | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [settlingStatus, setSettlingStatus] = useState<SettlingStatus | null>(null);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    await Promise.all(
      serviceDefinitions.map(async ({ id, name }) => {
        setServiceLoading((current) => ({ ...current, [id]: true }));
        let service: ServiceHealth;
        try {
          service = await api.serviceHealth(id);
        } catch {
          service = {
            id,
            name,
            running: false,
            checkedAt: new Date().toISOString(),
          };
        } finally {
          setServiceLoading((current) => ({ ...current, [id]: false }));
        }
        setServices((current) => [
          ...current.filter((item) => item.id !== id),
          service,
        ]);
      }),
    );
  }, []);

  const loadDeepSeekBalance = useCallback(async () => {
    setDeepSeekLoading(true);
    try {
      setDeepSeekBalance(await api.deepSeekBalance());
    } catch (caught) {
      setDeepSeekBalance({
        provider: "deepseek",
        amount: null,
        currency: "USD",
        updatedAt: new Date().toISOString(),
        error:
          caught instanceof Error ? caught.message : "Unable to load balance",
      });
    } finally {
      setDeepSeekLoading(false);
    }
  }, []);

  const loadTwoCaptchaBalance = useCallback(async () => {
    setTwoCaptchaLoading(true);
    try {
      setTwoCaptchaBalance(await api.twoCaptchaBalance());
    } catch (caught) {
      setTwoCaptchaBalance({
        provider: "2captcha",
        amount: null,
        currency: "USD",
        updatedAt: new Date().toISOString(),
        error:
          caught instanceof Error ? caught.message : "Unable to load balance",
      });
    } finally {
      setTwoCaptchaLoading(false);
    }
  }, []);

  const loadSystemMetrics = useCallback(async () => {
    try { setSystemMetrics(await api.systemMetrics()); }
    catch { setSystemMetrics(null); }
  }, []);

  const loadApplicationSummary = useCallback(async () => {
    const today = todayDateInput();
    const { from, to } = dateFilterRange(today, today);
    try { setApplicationSummary(await api.applicationStatusSummary(from!, to!)); }
    catch { setApplicationSummary(null); }
  }, []);

  const loadCrawlerSummary = useCallback(async () => {
    const today = todayDateInput();
    const { from, to } = dateFilterRange(today, today);
    try { setCrawlerSummary(await api.crawlerSummary(from!, to!)); }
    catch { setCrawlerSummary(null); }
  }, []);

  const loadSettlingStatus = useCallback(async () => {
    try { setSettlingStatus(readSettlingStatus((await api.settings()).settings)); }
    catch { setSettlingStatus(null); }
  }, []);

  const runCleanup = async () => {
    setCleanupRunning(true);
    setCleanupMessage(null);
    try {
      const report = await api.triggerCleanup();
      const expiredJobs = report.jobs?.removed ?? 0;
      const tempFolders = report.files?.removedTempDateFolders ?? 0;
      const logFolders = report.files?.removedLogDateFolders ?? 0;
      const summary = `Cleanup removed ${expiredJobs} jobs, ${tempFolders} temp folders, and ${logFolders} log folders.`;
      setCleanupMessage(report.errors.length ? `${summary} ${report.errors.join(" ")}` : summary);
    } catch (error) {
      setCleanupMessage(error instanceof Error ? error.message : "Cleanup failed.");
    } finally {
      setCleanupRunning(false);
    }
  };

  const refresh = useCallback(() => {
    void loadServices();
    void loadDeepSeekBalance();
    void loadTwoCaptchaBalance();
    void loadSystemMetrics();
    void loadSettlingStatus();
    void loadApplicationSummary();
    void loadCrawlerSummary();
  }, [loadApplicationSummary, loadCrawlerSummary, loadDeepSeekBalance, loadServices, loadSettlingStatus, loadSystemMetrics, loadTwoCaptchaBalance]);
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const running = services.filter((service) => service.running).length;
  const allRunning = services.length > 0 && running === serviceDefinitions.length;
  const refreshing =
    Object.values(serviceLoading).some(Boolean) ||
    deepSeekLoading ||
    twoCaptchaLoading;

  return (
    <>
      <Flex
        as="header"
        mb="8"
        align={{ base: "start", sm: "center" }}
        justify="space-between"
        gap="4"
      >
        <Box>
          <Text
            mb="2"
            fontSize="xs"
            fontWeight="bold"
            letterSpacing="0.18em"
            textTransform="uppercase"
            color="#498366"
          >
            System
          </Text>
          <Text
            as="h1"
            m="0"
            fontSize="3xl"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Dashboard
          </Text>
          <Text mt="2" fontSize="sm" color="gray.500">
            {services.length
              ? `${running} of ${serviceDefinitions.length} services running`
              : "Checking service availability"}
          </Text>
        </Box>
        <Flex direction="column" align="end" gap="2">
          <Flex align="center" gap="2">
            <Button variant="outline" bg="white" onClick={runCleanup} disabled={cleanupRunning}>
              {cleanupRunning ? <Spinner size="sm" /> : <Icon as={Trash2} boxSize="4" />}
              Run cleanup
            </Button>
            <Button variant="outline" bg="white" onClick={refresh}>
              {refreshing ? <Spinner size="sm" /> : <Icon as={RefreshCw} boxSize="4" />}
              Refresh
            </Button>
          </Flex>
          {cleanupMessage && <Text maxW="sm" textAlign="right" fontSize="xs" color={cleanupMessage.toLowerCase().includes("cleanup:") || cleanupMessage.toLowerCase().includes("failed") ? "red.600" : "gray.500"}>{cleanupMessage}</Text>}
        </Flex>
      </Flex>

      {settlingStatus && (
        <Box mb="6" maxW="2xl" borderRadius="2xl" border="1px solid" borderColor={settlingStatus.active || !settlingStatus.periods.length || !settlingStatus.configured ? "orange.200" : "blue.200"} bg={settlingStatus.active || !settlingStatus.periods.length || !settlingStatus.configured ? "orange.50" : "blue.50"} p="5">
          <Flex align="start" gap="3">
            <Icon as={AlertTriangle} mt="0.5" color={settlingStatus.active || !settlingStatus.periods.length || !settlingStatus.configured ? "orange.600" : "blue.600"} />
            <Box>
              <Text fontWeight="bold">
                {settlingStatus.active ? "Settling period active" : settlingStatus.periods.length ? "Application settling periods" : "No settling periods configured"}
              </Text>
              <Text mt="1" fontSize="sm" color="gray.700">
                {settlingStatus.periods.length
                  ? `${settlingStatus.periods.map(([from, to]) => `${from}–${to} UTC`).join(", ")} · ${settlingStatus.multiplier ?? "?"}× application pricing`
                  : "Applications are charged at their standard price until UTC windows are configured."}
              </Text>
              {!settlingStatus.configured && <Text mt="1" fontSize="xs" color="orange.800">Settling period settings are missing or invalid. Update them in App settings.</Text>}
              {!settlingStatus.periods.length && <Link to="/settings" style={{ color: "#9a3412", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>Configure settling periods</Link>}
            </Box>
          </Flex>
        </Box>
      )}

      <ApplicationStatusSection summary={applicationSummary} />

      <CrawlerSummarySection summary={crawlerSummary} />

      <SystemMetricsSection metrics={systemMetrics} />

      <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap="4" alignItems="start">
        <Box {...cardStyle}>
          <Flex align="center" justify="space-between" gap="3" mb="2">
            <Flex align="center" gap="3">
              <Flex
                h="10"
                w="10"
                align="center"
                justify="center"
                borderRadius="xl"
                bg={allRunning ? "green.50" : "red.50"}
                color={allRunning ? "green.700" : "red.600"}
              >
                <Icon as={Server} boxSize="5" />
              </Flex>
              <Text fontWeight="bold">Service availability</Text>
            </Flex>
            <Text fontSize="sm" color="gray.500">
              {services.length ? `${running} of ${serviceDefinitions.length} running` : "Checking..."}
            </Text>
          </Flex>
          {serviceDefinitions.map((definition) => {
            const service = services.find((item) => item.id === definition.id);
            const loading = serviceLoading[definition.id];
            return (
              <StatusRow
                key={definition.id}
                title={definition.name}
                note={service ? `Checked ${new Date(service.checkedAt).toLocaleTimeString()}` : "Waiting for health check"}
              >
                <Flex align="center" gap="2" fontSize="xs" fontWeight="bold" color={service?.running ? "green.700" : "red.600"}>
                  {loading ? (
                    <Spinner size="xs" />
                  ) : (
                    <Box h="2" w="2" borderRadius="full" bg={service?.running ? "green.400" : "red.400"} />
                  )}
                  {loading && !service ? "CHECKING" : service?.running ? "RUNNING" : "UNAVAILABLE"}
                </Flex>
              </StatusRow>
            );
          })}
        </Box>

        <Box {...cardStyle}>
          <Flex align="center" gap="3" mb="2">
            <Flex h="10" w="10" align="center" justify="center" borderRadius="xl" bg="blue.50" color="blue.600">
              <Icon as={WalletCards} boxSize="5" />
            </Flex>
            <Box>
              <Text fontWeight="bold">Provider balances</Text>
              <Text fontSize="xs" color="gray.400">Current API credit</Text>
            </Box>
          </Flex>
          <BalanceRow provider="deepseek" balance={deepSeekBalance} loading={deepSeekLoading} />
          {/* <BalanceRow provider="openai" balance={openAiBalance} loading={openAiLoading} /> */}
          <BalanceRow provider="2captcha" balance={twoCaptchaBalance} loading={twoCaptchaLoading} />
        </Box>
      </Grid>
    </>
  );
}
