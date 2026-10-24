import { useEffect, useState } from "react";
import { Box, Button, Flex, NativeSelect, Table, Text } from "@chakra-ui/react";
import { api } from "../../api";
import { PagePicker } from "../../components/PagePicker";
import type { Crawler } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { UploadCrawledJobsModal } from "./components/UploadCrawledJobsModal";

const STATUS_OPTIONS = ["queued", "inserted", "ignored", "duplicated", "failed"];

const time = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

export function CrawledJobsPage() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.crawledJobs>> | null>(null);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [crawlerId, setCrawlerId] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    api.crawlers().then((r) => setCrawlers(r.crawlers)).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.crawledJobs(page, {
      status: status || undefined,
      crawlerId: crawlerId ? Number(crawlerId) : undefined,
    }).then((value) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(value.pagination.total / value.pagination.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setResult(value);
    }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "Unable to load crawled jobs");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status, crawlerId, revision]);

  const pages = result ? Math.max(1, Math.ceil(result.pagination.total / result.pagination.pageSize)) : 1;
  return <>
    {showUpload && (
      <UploadCrawledJobsModal
        onClose={() => setShowUpload(false)}
        onUploaded={() => {
          setShowUpload(false);
          setRevision((value) => value + 1);
        }}
      />
    )}
    <Flex as="header" justify="space-between" align="center" gap="4" mb="8">
      <Box>
        <Text as="h1" fontSize="3xl" fontWeight="bold">Crawled jobs</Text>
        <Text color="gray.500">Jobs handed off to ats-engine, newest first. A run's jobs are removed once all are processed; its counts stay on the crawler.</Text>
      </Box>
      <Flex gap="3">
        <Button bg="green.600" color="white" _hover={{ bg: "green.700" }} onClick={() => setShowUpload(true)}>Upload jobs</Button>
        <Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
      </Flex>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
    <Flex gap="3" mb="5" flexWrap="wrap">
      <NativeSelect.Root maxW="52" bg="white">
        <NativeSelect.Field
          value={status}
          onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          fontSize="sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      <NativeSelect.Root maxW="64" bg="white">
        <NativeSelect.Field
          value={crawlerId}
          onChange={(event) => { setCrawlerId(event.target.value); setPage(1); }}
          fontSize="sm"
        >
          <option value="">All crawlers</option>
          {crawlers.map((crawler) => (
            <option key={crawler.id} value={crawler.id}>{crawler.name}</option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Flex>
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" overflow="hidden">
      <Box p="5"><Text fontWeight="bold">{loading ? "Loading..." : error ? "Crawled jobs" : `${result?.pagination.total ?? 0} job(s)`}</Text><Text fontSize="xs" color="gray.500">Most recently crawled first</Text></Box>
      <Box overflowX="auto"><Table.Root size="sm" minW="1100px">
        <Table.Header bg="gray.50"><Table.Row>{["Title", "Company", "Status", "Crawler type", "Crawler name", "Created"].map((label) => <Table.ColumnHeader key={label} p="4">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
        <Table.Body>
          {loading || error || !result?.crawledJobs.length ? <Table.Row><Table.Cell colSpan={6} p="8" textAlign="center">{loading ? "Loading crawled jobs..." : error ? "Unable to load crawled jobs. Use Refresh to retry." : "No crawled jobs match these filters."}</Table.Cell></Table.Row> : result.crawledJobs.map((job) => <Table.Row key={job.id} _hover={{ bg: "gray.50" }}>
            <Table.Cell p="4" fontWeight="semibold">{job.title}</Table.Cell>
            <Table.Cell p="4">{job.company}</Table.Cell>
            <Table.Cell p="4"><StatusBadge status={job.status} /></Table.Cell>
            <Table.Cell p="4">{job.crawlerType}</Table.Cell>
            <Table.Cell p="4">{job.crawlerName}</Table.Cell>
            <Table.Cell p="4" color="gray.500">{time(job.createdAt)}</Table.Cell>
          </Table.Row>)}
        </Table.Body>
      </Table.Root></Box>
      <Flex p="4" justify="space-between" align="center" gap="3" wrap="wrap"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2" align="center"><PagePicker page={page} totalPages={pages} onChange={setPage} disabled={loading || !!error} /><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></Flex></Flex>
    </Box>
  </>;
}
