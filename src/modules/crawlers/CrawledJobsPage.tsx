import { useEffect, useState } from "react";
import { Box, Button, Flex, Table, Text } from "@chakra-ui/react";
import { api } from "../../api";
import { StatusBadge } from "../../components/ui/StatusBadge";

export function CrawledJobsPage() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.crawledJobs>> | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.crawledJobs(page).then((value) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(value.pagination.total / value.pagination.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setResult(value);
    }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "Unable to load crawled jobs");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision]);

  const pages = result ? Math.max(1, Math.ceil(result.pagination.total / result.pagination.pageSize)) : 1;

  return <>
    <Flex as="header" justify="space-between" align="center" gap="4" mb="8">
      <Box>
        <Text as="h1" fontSize="3xl" fontWeight="bold">Crawled jobs</Text>
        <Text color="gray.500">Jobs waiting for ats-engine to process. Rows disappear once claimed.</Text>
      </Box>
      <Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" overflow="hidden">
      <Box p="5"><Text fontWeight="bold">{loading ? "Loading..." : error ? "Crawled jobs" : `${result?.pagination.total ?? 0} pending`}</Text><Text fontSize="xs" color="gray.500">Most recently crawled first</Text></Box>
      <Box overflowX="auto"><Table.Root size="sm" minW="900px">
        <Table.Header bg="gray.50"><Table.Row>{["Title", "Company", "Status", "Crawler type", "Crawler name"].map((label) => <Table.ColumnHeader key={label} p="4">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
        <Table.Body>
          {loading || error || !result?.crawledJobs.length ? <Table.Row><Table.Cell colSpan={5} p="8" textAlign="center">{loading ? "Loading crawled jobs..." : error ? "Unable to load crawled jobs. Use Refresh to retry." : "Nothing pending -- ats-engine is caught up."}</Table.Cell></Table.Row> : result.crawledJobs.map((job) => <Table.Row key={job.id} _hover={{ bg: "gray.50" }}>
            <Table.Cell p="4" fontWeight="semibold">{job.title}</Table.Cell>
            <Table.Cell p="4">{job.company}</Table.Cell>
            <Table.Cell p="4"><StatusBadge status={job.status} /></Table.Cell>
            <Table.Cell p="4">{job.crawlerType}</Table.Cell>
            <Table.Cell p="4">{job.crawlerName}</Table.Cell>
          </Table.Row>)}
        </Table.Body>
      </Table.Root></Box>
      <Flex p="4" justify="space-between" align="center"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2"><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></Flex></Flex>
    </Box>
  </>;
}
