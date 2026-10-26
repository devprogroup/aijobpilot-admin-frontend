import { useEffect, useState } from "react";
import { Box, Button, Flex, SimpleGrid, Table, Text } from "@chakra-ui/react";
import { api } from "../../../api";
import type { CrawlerRun, CrawlerRunProgress } from "../../../types";
import { StatusBadge } from "../../../components/ui/StatusBadge";

/** How often a running run's progress is reloaded. */
const REFRESH_MS = 5000;

const number = (value: number) => new Intl.NumberFormat().format(value);

const clock = (date: string | null) =>
  date ? new Intl.DateTimeFormat(undefined, { timeStyle: "medium" }).format(new Date(date)) : "—";

function duration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box borderRadius="xl" bg="gray.50" p="4">
      <Text m="0" fontSize="xs" fontWeight="semibold" color="gray.500">{label}</Text>
      <Text m="0" mt="1" fontSize="xl" fontWeight="bold">{value}</Text>
      {hint && <Text m="0" mt="1" fontSize="xs" color="gray.400">{hint}</Text>}
    </Box>
  );
}

/** Live progress of one crawler run, read from its log: companies done out of the run's total,
 * jobs loaded and filtered so far, skipped / failed companies, ETA and the latest activity.
 * Reloads every few seconds while the run is running. */
export function CrawlerRunProgressPanel({ crawlerId, run, onFinished }: {
  crawlerId: number;
  run: CrawlerRun;
  /** Called once when a run that was running has finished, so the page can reload it. */
  onFinished: () => void;
}) {
  const [progress, setProgress] = useState<CrawlerRunProgress | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [revision, setRevision] = useState(0);
  const running = run.status === "running";

  useEffect(() => {
    let active = true;
    let finishedReported = false;
    setProgress(null);
    setError("");
    const load = async () => {
      try {
        const result = await api.crawlerRunProgress(crawlerId, run.id);
        if (!active) return;
        setProgress(result.progress);
        setError("");
        setNow(Date.now());
        if (running && result.progress.finish && !finishedReported) {
          finishedReported = true;
          onFinished();
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Unable to load progress");
      }
    };
    void load();
    const timer = running ? window.setInterval(() => void load(), REFRESH_MS) : undefined;
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [crawlerId, run.id, running, revision]);

  const startedAt = progress?.startedAt ? new Date(progress.startedAt).getTime() : null;
  const endedAt = progress?.finish && progress.lastEventAt ? new Date(progress.lastEventAt).getTime() : now;
  const elapsed = startedAt ? endedAt - startedAt : null;
  const total = progress?.total ?? null;
  const done = progress?.done ?? 0;
  const percent = total ? Math.min(100, Math.round((done / total) * 100)) : null;
  const eta =
    running && total && done > 0 && elapsed && done < total ? duration((elapsed / done) * (total - done)) : null;
  const sinceUpdate = progress?.lastEventAt ? now - new Date(progress.lastEventAt).getTime() : null;

  return (
    <Box
      as="section"
      id="crawler-run-progress"
      mb="8"
      borderRadius="2xl"
      border="1px solid"
      borderColor="gray.200"
      bg="white"
      p="6"
      boxShadow="0 12px 35px rgba(24, 43, 34, .07)"
    >
      <Flex mb="5" align="flex-start" justify="space-between" gap="4" wrap="wrap">
        <Box>
          <Flex align="center" gap="3">
            <Text m="0" fontWeight="bold">Run #{run.id} progress</Text>
            <StatusBadge status={run.status} />
          </Flex>
          <Text mt="1" fontSize="xs" color="gray.400">
            {running
              ? `Refreshes every ${REFRESH_MS / 1000} seconds${sinceUpdate !== null ? ` · last activity ${duration(sinceUpdate)} ago` : ""}`
              : "Read from the run log"}
          </Text>
        </Box>
        {!running && (
          <Button size="sm" variant="outline" onClick={() => setRevision((value) => value + 1)}>
            Refresh
          </Button>
        )}
      </Flex>

      {error ? (
        <Text role="alert" fontSize="sm" color="red.600">{error}</Text>
      ) : !progress ? (
        <Text role="status" fontSize="sm" color="gray.500">Loading progress…</Text>
      ) : !progress.crawler ? (
        <Text fontSize="sm" color="gray.500">
          This crawler does not log per-company progress. Open the run log for details.
        </Text>
      ) : (
        <>
          <Box mb="5">
            <Flex mb="2" justify="space-between" fontSize="sm">
              <Text m="0" fontWeight="semibold">
                {number(done)}{total !== null ? ` of ${number(total)}` : ""} companies
                {percent !== null ? ` · ${percent}%` : ""}
              </Text>
              <Text m="0" color="gray.500">
                {elapsed !== null ? `${duration(elapsed)} elapsed` : ""}
                {eta ? ` · about ${eta} left` : ""}
              </Text>
            </Flex>
            <Box h="2.5" borderRadius="full" bg="gray.100" overflow="hidden" role="progressbar" aria-valuenow={percent ?? undefined} aria-valuemin={0} aria-valuemax={100}>
              <Box h="full" w={`${percent ?? (progress.finish ? 100 : 0)}%`} bg={progress.failed ? "orange.400" : "green.500"} transition="width .4s" />
            </Box>
            {progress.current && (
              <Text mt="2" mb="0" fontSize="xs" color="gray.500">
                {running ? "Working on / last done: " : "Last company: "}
                <Text as="span" fontFamily="mono">{progress.current}</Text>
              </Text>
            )}
          </Box>

          <SimpleGrid columns={{ base: 2, md: 3, xl: 5 }} gap="3" mb="5">
            <Stat label="Jobs loaded" value={number(progress.published)} hint="Published to crawled jobs" />
            <Stat label="Jobs filtered out" value={number(progress.filtered)} hint="Not software / engineering" />
            <Stat label="Companies crawled" value={number(progress.crawled)} />
            <Stat label="Companies skipped" value={number(progress.skipped)} hint="Not found / invalid / empty" />
            <Stat label="Companies failed" value={number(progress.failed)} hint="Errors after retries" />
          </SimpleGrid>

          {progress.finish?.errorMessage && (
            <Box mb="5" borderRadius="xl" bg="red.50" p="4" fontSize="sm" color="red.700">
              Run failed: {progress.finish.errorMessage}
            </Box>
          )}

          <Text mb="2" fontSize="sm" fontWeight="semibold">Recent activity</Text>
          <Box overflowX="auto" border="1px solid" borderColor="gray.100" borderRadius="xl">
            <Table.Root size="sm" minW="640px">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader fontSize="xs" color="gray.400" px="4" py="2">Time</Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="xs" color="gray.400" px="4" py="2">Company</Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="xs" color="gray.400" px="4" py="2">Result</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {!progress.recent.length && (
                  <Table.Row>
                    <Table.Cell colSpan={3} px="4" py="6" textAlign="center" color="gray.400">No company handled yet.</Table.Cell>
                  </Table.Row>
                )}
                {progress.recent.map((item, index) => (
                  <Table.Row key={`${item.at}-${index}`}>
                    <Table.Cell px="4" py="2" color="gray.500" whiteSpace="nowrap">{clock(item.at)}</Table.Cell>
                    <Table.Cell px="4" py="2" fontFamily="mono" fontSize="xs" wordBreak="break-all">{item.unit ?? "—"}</Table.Cell>
                    <Table.Cell px="4" py="2" color={item.level === "error" ? "red.600" : item.level === "warn" ? "orange.600" : undefined}>
                      {item.event.endsWith("crawled")
                        ? `${number(item.published ?? 0)} loaded · ${number(item.filtered ?? 0)} filtered${item.total !== null ? ` · ${number(item.total)} jobs listed` : ""}`
                        : `${item.event.replace(/_/g, " ")}${item.message ? `: ${item.message}` : ""}`}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </>
      )}
    </Box>
  );
}
