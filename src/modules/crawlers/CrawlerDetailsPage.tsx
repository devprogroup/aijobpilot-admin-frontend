import { useEffect, useState } from "react";
import {
  Box,
  Button,
  chakra,
  Field,
  Flex,
  Icon,
  Input,
  SimpleGrid,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { ArrowLeft, Play, Save, Trash2 } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import type { Crawler } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CrawlerRunLogDialog } from "./components/CrawlerRunLogDialog";
import { toaster } from "../../components/ui/toaster";

const ChakraRouterLink = chakra(Link);

const time = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(date))
    : "—";

export function CrawlerDetailsPage() {
  const { crawlerId: crawlerIdParam } = useParams();
  const crawlerId = Number(crawlerIdParam);
  const navigate = useNavigate();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [name, setName] = useState("");
  const [config, setConfig] = useState("{}");
  const [stopSignalData, setStopSignalData] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logRunId, setLogRunId] = useState<string | null>(null);

  const load = async () => {
    if (!Number.isInteger(crawlerId) || crawlerId < 1) return;
    try {
      const result = await api.crawler(crawlerId);
      setCrawler(result.crawler);
      setName(result.crawler.name);
      setConfig(JSON.stringify(result.crawler.config, null, 2));
      setStopSignalData(result.crawler.stopSignalData ?? "");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load crawler",
      );
    }
  };
  useEffect(() => {
    load();
  }, [crawlerId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const parsedConfig = JSON.parse(config);
      await api.updateCrawler(crawlerId, {
        name: name.trim(),
        config: parsedConfig,
        stopSignalData: stopSignalData.trim() || null,
      });
      await load();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save crawler",
      );
    } finally {
      setSaving(false);
    }
  };

  const start = async () => {
    setError("");
    setStarting(true);
    try {
      await api.queueCrawler(crawlerId);
      await load();
      toaster.create({ title: "Crawler queued to run now.", type: "success" });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to start crawler",
      );
    } finally {
      setStarting(false);
    }
  };

  const remove = async () => {
    if (
      !crawler ||
      !window.confirm(`Delete crawler "${crawler.name}"? This cannot be undone.`)
    )
      return;
    setError("");
    setDeleting(true);
    try {
      await api.deleteCrawler(crawlerId);
      toaster.create({ title: "Crawler deleted.", type: "success" });
      navigate("/crawlers/fleets");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to delete crawler",
      );
      setDeleting(false);
    }
  };

  if (!Number.isInteger(crawlerId) || crawlerId < 1)
    return <Navigate to="/crawlers/fleets" replace />;
  if (!crawler) {
    return (
      <Box>
        {error ? (
          <Box borderRadius="xl" bg="red.50" p="4" color="red.700">
            {error}
          </Box>
        ) : (
          "Loading crawler…"
        )}
      </Box>
    );
  }

  return (
    <>
      <ChakraRouterLink
        to="/crawlers/fleets"
        display="flex"
        mb="5"
        alignItems="center"
        gap="2"
        fontSize="sm"
        fontWeight="semibold"
        color="gray.500"
        _hover={{ color: "gray.800" }}
      >
        <Icon as={ArrowLeft} boxSize="4" />
        Back to crawler fleet
      </ChakraRouterLink>

      <Flex as="header" mb="8" align="flex-start" justify="space-between" gap="4" flexWrap="wrap">
        <Box>
          <Text
            mb="2"
            fontSize="xs"
            fontWeight="bold"
            letterSpacing="0.18em"
            textTransform="uppercase"
            color="#498366"
          >
            Crawler details
          </Text>
          <Flex align="center" gap="3">
            <Text
              as="h1"
              m="0"
              fontSize="3xl"
              fontWeight="bold"
              letterSpacing="tight"
            >
              {crawler.name}
            </Text>
            <StatusBadge status={crawler.status} />
          </Flex>
          <Text mt="2" fontSize="sm" color="gray.500">
            {crawler.crawlerType.name} · Crawler #{crawler.id}
          </Text>
        </Box>
        <Flex gap="3">
          <Button
            onClick={start}
            disabled={starting || !(crawler.status === "idle" && crawler.active)}
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.700" }}
          >
            <Icon as={Play} boxSize="4" />
            {starting ? "Starting…" : "Start"}
          </Button>
          <Button
            onClick={remove}
            disabled={deleting || crawler.status === "running"}
            variant="outline"
            borderColor="red.200"
            color="red.600"
            _hover={{ bg: "red.50" }}
          >
            <Icon as={Trash2} boxSize="4" />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </Flex>
      </Flex>

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
        as="form"
        onSubmit={save}
        mb="8"
        borderRadius="2xl"
        border="1px solid"
        borderColor="gray.200"
        bg="white"
        p="6"
        boxShadow="0 12px 35px rgba(24, 43, 34, .07)"
      >
        <Box mb="5">
          <Text m="0" fontWeight="bold">
            Configuration
          </Text>
          <Text mt="1" fontSize="xs" color="gray.400">
            Update the crawler name and runtime configuration.
          </Text>
        </Box>
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap="5">
          <Field.Root required>
            <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
              Crawler name
            </Field.Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              borderColor="gray.200"
              fontSize="sm"
            />
          </Field.Root>
          <Field.Root disabled>
            <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
              Crawler type
            </Field.Label>
            <Input
              disabled
              value={crawler.crawlerType.name}
              bg="gray.50"
              borderColor="gray.200"
              fontSize="sm"
              color="gray.500"
            />
          </Field.Root>
          <Field.Root>
            <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
              Stop signal data
            </Field.Label>
            <Input
              value={stopSignalData}
              onChange={(event) => setStopSignalData(event.target.value)}
              borderColor="gray.200"
              fontSize="sm"
              placeholder="e.g. minScore"
            />
          </Field.Root>
        </SimpleGrid>
        <Field.Root mt="5">
          <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
            Config (JSON)
          </Field.Label>
          <Textarea
            rows={10}
            value={config}
            onChange={(event) => setConfig(event.target.value)}
            borderColor="gray.200"
            fontFamily="mono"
            fontSize="sm"
          />
        </Field.Root>
        <Flex mt="5" justify="flex-end">
          <Button
            type="submit"
            disabled={saving}
            bg="green.600"
            color="white"
            _hover={{ bg: "green.700" }}
          >
            <Icon as={Save} boxSize="4" />
            {saving ? "Saving…" : "Save configuration"}
          </Button>
        </Flex>
      </Box>

      <Box
        as="section"
        overflow="hidden"
        borderRadius="2xl"
        border="1px solid"
        borderColor="gray.200"
        bg="white"
        boxShadow="0 12px 35px rgba(24, 43, 34, .07)"
      >
        <Box borderBottom="1px solid" borderColor="gray.100" p="5">
          <Text m="0" fontWeight="bold">
            Bot runs
          </Text>
          <Text mt="1" fontSize="xs" color="gray.400">
            {crawler.crawlerRuns?.length ?? 0} recorded runs
          </Text>
        </Box>
        <Box overflowX="auto">
          <Table.Root minW="900px" size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Started
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Finished
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
                  Inserted
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Ignored
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Duplicated
                </Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Log</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {!crawler.crawlerRuns?.length && (
                <Table.Row>
                  <Table.Cell
                    colSpan={7}
                    px="5"
                    py="10"
                    textAlign="center"
                    color="gray.400"
                  >
                    No bot runs yet.
                  </Table.Cell>
                </Table.Row>
              )}
              {crawler.crawlerRuns?.map((run) => (
                <Table.Row key={run.id}>
                  <Table.Cell px="5" py="4" color="gray.500">
                    {time(run.startedAt)}
                  </Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.500">
                    {time(run.finishedAt)}
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    <StatusBadge status={run.status} />
                  </Table.Cell>
                  <Table.Cell px="5" py="4">{run.counts.inserted}</Table.Cell>
                  <Table.Cell px="5" py="4">{run.counts.ignored}</Table.Cell>
                  <Table.Cell px="5" py="4">{run.counts.duplicated}</Table.Cell>
                  <Table.Cell px="5" py="4">
                    {run.logFilePath ? (
                      <Button variant="plain" size="sm" color="green.700" textDecoration="underline" onClick={() => setLogRunId(String(run.id))}>View log</Button>
                    ) : <Text color="gray.400">Unavailable</Text>}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
      {logRunId !== null && <CrawlerRunLogDialog crawlerId={crawlerId} runId={logRunId} onClose={() => setLogRunId(null)} />}
    </>
  );
}
