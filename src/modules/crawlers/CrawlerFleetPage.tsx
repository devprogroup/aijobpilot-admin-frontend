import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  chakra,
  Flex,
  Icon,
  IconButton,
  Input,
  InputGroup,
  Switch,
  Table,
  Text,
} from "@chakra-ui/react";
import { ListOrdered, Play, Plus, RefreshCw, ScrollText, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Crawler, CrawlerRunCounts } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CreateCrawlerModal } from "./components/CreateCrawlerModal";
import { CrawlerRunLogDialog } from "./components/CrawlerRunLogDialog";
import { onSocketEvent } from "../../services/websocket";

interface CrawlerStatusChangedEvent {
  crawlerId: number;
  status: Crawler["status"];
}

const ChakraRouterLink = chakra(Link);

const time = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(date))
    : "—";

/** Every crawled_jobs row of a run, whatever ats-engine did with it. */
const crawledTotal = (counts: CrawlerRunCounts) =>
  counts.queued + counts.inserted + counts.ignored + counts.duplicated + counts.failed;

export function CrawlerFleetPage() {
  const [items, setItems] = useState<Crawler[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deletingCrawlerId, setDeletingCrawlerId] = useState<number | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [notice, setNotice] = useState("");
  const [logRun, setLogRun] = useState<{ crawlerId: number; runId: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setItems((await api.crawlers()).crawlers);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load crawlers",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => onSocketEvent<CrawlerStatusChangedEvent>("crawler:status-changed", (event) => {
    setItems((current) => current.map((item) =>
      item.id === event.crawlerId ? { ...item, status: event.status } : item,
    ));
    // A run that just started isn't the list's latestRun yet; reload so its log button appears.
    if (event.status === "running") void load();
  }), []);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter(
      (crawler) =>
        !term ||
        crawler.name.toLowerCase().includes(term) ||
        (crawler.crawlerType?.name || "").toLowerCase().includes(term),
    );
  }, [items, query]);

  const toggle = async (crawler: Crawler) => {
    setItems((current) =>
      current.map((item) =>
        item.id === crawler.id ? { ...item, active: !item.active } : item,
      ),
    );
    try {
      await api.toggleCrawler(crawler.id, !crawler.active);
    } catch (error) {
      setItems((current) =>
        current.map((item) => (item.id === crawler.id ? crawler : item)),
      );
      setError(
        error instanceof Error ? error.message : "Unable to update crawler",
      );
    }
  };

  const queue = async (crawler: Crawler) => {
    setError("");
    setItems((current) =>
      current.map((item) =>
        item.id === crawler.id
          ? { ...item, status: "queued", queuedAt: new Date().toISOString() }
          : item,
      ),
    );
    try {
      const { crawler: updated } = await api.queueCrawler(crawler.id);
      setItems((current) =>
        current.map((item) =>
          item.id === crawler.id
            ? { ...item, status: updated.status, queuedAt: updated.queuedAt }
            : item,
        ),
      );
    } catch (error) {
      setItems((current) =>
        current.map((item) => (item.id === crawler.id ? crawler : item)),
      );
      setError(
        error instanceof Error ? error.message : "Unable to queue crawler",
      );
    }
  };

  /** Queues every active, idle crawler; crawler-backend runs them one after another. */
  const runAll = async () => {
    if (runningAll) return;
    if (!window.confirm("Run every active, idle crawler one after another?")) return;
    setError("");
    setNotice("");
    setRunningAll(true);
    try {
      const { queued } = await api.runAllCrawlers();
      setNotice(queued
        ? `${queued} crawler(s) queued -- they run one after another.`
        : "No active, idle crawler to run.");
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to run crawlers");
    } finally {
      setRunningAll(false);
    }
  };

  const remove = async (crawler: Crawler) => {
    if (crawler.status === "running" || deletingCrawlerId !== null) return;
    if (!window.confirm(`Delete crawler "${crawler.name}"? This cannot be undone.`)) return;

    setError("");
    setDeletingCrawlerId(crawler.id);
    try {
      await api.deleteCrawler(crawler.id);
      setItems((current) => current.filter((item) => item.id !== crawler.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete crawler");
    } finally {
      setDeletingCrawlerId(null);
    }
  };

  return (
    <>
      {showCreate && (
        <CreateCrawlerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      <Flex
        as="header"
        mb="8"
        flexWrap="wrap"
        align="flex-end"
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
            Operations
          </Text>
          <Text
            as="h1"
            m="0"
            fontSize="3xl"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Crawler fleet
          </Text>
          <Text mt="2" fontSize="sm" color="gray.500">
            Manage crawler availability and queue runs.
          </Text>
        </Box>
        <Flex align="center" gap="3">
          <Button
            onClick={() => void runAll()}
            loading={runningAll}
            disabled={!items.some((crawler) => crawler.active && crawler.status === "idle")}
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.700" }}
          >
            <Icon as={ListOrdered} boxSize="4" />
            Run all
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            bg="green.600"
            color="white"
            _hover={{ bg: "green.700" }}
          >
            <Icon as={Plus} boxSize="4" />
            Create crawler
          </Button>
          <Button
            onClick={load}
            variant="outline"
            borderColor="gray.200"
            bg="white"
          >
            <Icon
              as={RefreshCw}
              boxSize="4"
              className={loading ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
        </Flex>
      </Flex>

      {notice && (
        <Box mb="5" borderRadius="xl" bg="green.50" p="4" fontSize="sm" color="green.700" role="status">
          {notice}
        </Box>
      )}

      {error && (
        <Box
          mb="5"
          borderRadius="xl"
          bg="red.50"
          p="4"
          fontSize="sm"
          color="red.700"
        >
          {error}
        </Box>
      )}

      <Box
        as="section"
        overflow="hidden"
        borderRadius="2xl"
        border="1px solid"
        borderColor="gray.200"
        bg="white"
        boxShadow="0 12px 35px rgba(24, 43, 34, .07)"
      >
        <Flex
          flexWrap="wrap"
          align="center"
          justify="space-between"
          gap="3"
          borderBottom="1px solid"
          borderColor="gray.100"
          p="5"
        >
          <Box>
            <Text m="0" fontWeight="bold">
              Crawlers
            </Text>
            <Text mt="1" fontSize="xs" color="gray.400">
              {items.length} crawlers registered
            </Text>
          </Box>
          <InputGroup
            startElement={<Icon as={Search} boxSize="4" color="gray.400" />}
            maxW="44"
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search crawlers"
              bg="gray.100"
              border="none"
              fontSize="sm"
            />
          </InputGroup>
        </Flex>
        <Box overflowX="auto">
          <Table.Root minW="1000px" size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Crawler name
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Crawler type
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Status
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Latest run
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Last run result
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Ingested / crawled
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Stop signal data
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Enabled
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                  textAlign="right"
                >
                  Actions
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {!loading && shown.length === 0 && (
                <Table.Row>
                  <Table.Cell
                    colSpan={9}
                    px="5"
                    py="10"
                    textAlign="center"
                    color="gray.400"
                  >
                    No crawlers found.
                  </Table.Cell>
                </Table.Row>
              )}
              {shown.map((crawler) => (
                <Table.Row key={crawler.id} _hover={{ bg: "gray.50" }}>
                  <Table.Cell px="5" py="4">
                    <ChakraRouterLink
                      to={`/crawlers/fleets/${crawler.id}`}
                      fontWeight="semibold"
                      color="green.700"
                      _hover={{ textDecoration: "underline" }}
                    >
                      {crawler.name}
                    </ChakraRouterLink>
                  </Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.600">
                    {crawler.crawlerType?.name ?? "Unknown type"}
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    <StatusBadge status={crawler.status} />
                  </Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.500">
                    {time(crawler.latestRun?.startedAt ?? null)}
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    <StatusBadge
                      status={crawler.latestRun
                        ? crawler.latestRun.status === "finished"
                          ? "successful"
                          : crawler.latestRun.status
                        : "not run"}
                    />
                  </Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.600">
                    {crawler.latestRun ? (
                      <Box>
                      <Flex align="center" gap="2">
                        <Text title="Jobs ats-engine inserted from the latest run / jobs that run crawled after the title filter (jobs it saw before the title filter)">
                          <Text as="span" fontWeight="semibold" color="green.700">
                            {crawler.latestRun.counts.inserted.toLocaleString()}
                          </Text>
                          {" / "}
                          {crawledTotal(crawler.latestRun.counts).toLocaleString()}
                          {typeof crawler.latestRun.titleFiltered === "number" && (
                            <Text as="span" color="gray.400">
                              {" ("}
                              {(crawledTotal(crawler.latestRun.counts) + crawler.latestRun.titleFiltered).toLocaleString()}
                              {")"}
                            </Text>
                          )}
                        </Text>
                        {crawler.status === "running" && crawler.latestRun.status === "running" && crawler.latestRun.logFilePath && (
                          <IconButton
                            size="2xs"
                            variant="ghost"
                            color="green.700"
                            title="View the running crawl's log"
                            aria-label={`View ${crawler.name} run log`}
                            onClick={() => setLogRun({ crawlerId: crawler.id, runId: crawler.latestRun!.id })}
                          >
                            <Icon as={ScrollText} boxSize="3.5" />
                          </IconButton>
                        )}
                      </Flex>
                      {crawler.latestRun.units && crawler.crawlerType?.name.endsWith("-api") && (
                        <Text
                          mt="0.5"
                          fontSize="xs"
                          color="gray.400"
                          title="Companies the latest run has handled (crawled, skipped or failed) / companies it set out to crawl"
                        >
                          {crawler.latestRun.units.done.toLocaleString()}
                          {crawler.latestRun.units.total !== null && ` / ${crawler.latestRun.units.total.toLocaleString()}`}
                          {" companies"}
                        </Text>
                      )}
                      </Box>
                    ) : "—"}
                  </Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.500">
                    {crawler.stopSignalData ?? "—"}
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    <Switch.Root
                      checked={crawler.active}
                      onCheckedChange={() => toggle(crawler)}
                      colorPalette="green"
                    >
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      <Switch.Label srOnly>Toggle {crawler.name}</Switch.Label>
                    </Switch.Root>
                  </Table.Cell>
                  <Table.Cell px="5" py="4" textAlign="right">
                    <Flex justify="flex-end" gap="2">
                      <Button
                        size="xs"
                        disabled={!(crawler.status === "idle" && crawler.active) || deletingCrawlerId !== null}
                        onClick={() => queue(crawler)}
                        bg="gray.900"
                        color="white"
                        _hover={{ bg: "gray.700" }}
                      >
                        <Icon as={Play} boxSize="3.5" />
                        Run
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        disabled={crawler.status === "running" || deletingCrawlerId !== null}
                        loading={deletingCrawlerId === crawler.id}
                        onClick={() => void remove(crawler)}
                        aria-label={`Delete ${crawler.name}`}
                      >
                        <Icon as={Trash2} boxSize="3.5" />
                        Delete
                      </Button>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
      {logRun && (
        <CrawlerRunLogDialog crawlerId={logRun.crawlerId} runId={logRun.runId} onClose={() => setLogRun(null)} />
      )}
    </>
  );
}
