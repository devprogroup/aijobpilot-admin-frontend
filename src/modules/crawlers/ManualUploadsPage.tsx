import { useEffect, useState } from "react";
import { Box, Button, Flex, Icon, Table, Text } from "@chakra-ui/react";
import { Upload } from "lucide-react";
import { api } from "../../api";
import { PagePicker } from "../../components/PagePicker";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { CrawledJobRow, ManualUpload, Pagination } from "../../types";
import { UploadCrawledJobsModal } from "./components/UploadCrawledJobsModal";
import { MANUAL_CRAWLER_TYPE_NAME } from "./manual-crawler";

const time = (date: string | null) =>
  date ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date)) : "—";

const COUNT_COLUMNS: Array<[keyof ManualUpload["counts"], string]> = [
  ["queued", "Queued"],
  ["inserted", "Inserted"],
  ["duplicated", "Duplicated"],
  ["ignored", "Ignored"],
  ["failed", "Failed"],
];

function Pager({ page, pages, disabled, onChange }: { page: number; pages: number; disabled: boolean; onChange: (page: number) => void }) {
  return (
    <Flex p="4" justify="space-between" align="center" gap="3" wrap="wrap">
      <Text fontSize="sm">Page {page} of {pages}</Text>
      <Flex gap="2" align="center">
        <PagePicker page={page} totalPages={pages} onChange={onChange} disabled={disabled} />
        <Button size="sm" variant="outline" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
        <Button size="sm" variant="outline" disabled={disabled || page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
      </Flex>
    </Flex>
  );
}

/**
 * Crawlers > Manual uploads: crawled-job payloads uploaded by hand (e.g. the crawler extension's
 * exports). Each upload is a run of the built-in "Manual upload" crawler; its jobs go through the
 * same fetch + ats-engine pipeline as a crawl. Lists the uploads with what became of their jobs,
 * and the jobs still stored (a run's jobs are removed once all are processed).
 */
export function ManualUploadsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [revision, setRevision] = useState(0);

  const [uploads, setUploads] = useState<{ uploads: ManualUpload[]; pagination: Pagination } | null>(null);
  const [uploadsPage, setUploadsPage] = useState(1);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [uploadsError, setUploadsError] = useState("");

  /** The upload whose jobs are listed; null: every upload's. */
  const [selected, setSelected] = useState<number | null>(null);
  const [jobs, setJobs] = useState<{ crawledJobs: CrawledJobRow[]; pagination: Pagination } | null>(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");

  useEffect(() => {
    let active = true;
    setUploadsLoading(true); setUploadsError("");
    api.manualUploads(uploadsPage).then((value) => {
      if (active) setUploads(value);
    }).catch((error: unknown) => {
      if (active) setUploadsError(error instanceof Error ? error.message : "Unable to load uploads");
    }).finally(() => { if (active) setUploadsLoading(false); });
    return () => { active = false; };
  }, [uploadsPage, revision]);

  useEffect(() => {
    let active = true;
    setJobsLoading(true); setJobsError("");
    api.crawledJobs(jobsPage, { crawlerType: MANUAL_CRAWLER_TYPE_NAME, crawlerRunId: selected ?? undefined }).then((value) => {
      if (active) setJobs(value);
    }).catch((error: unknown) => {
      if (active) setJobsError(error instanceof Error ? error.message : "Unable to load uploaded jobs");
    }).finally(() => { if (active) setJobsLoading(false); });
    return () => { active = false; };
  }, [jobsPage, selected, revision]);

  const select = (id: number | null) => {
    setSelected((current) => (current === id ? null : id));
    setJobsPage(1);
  };

  return <>
    {showUpload && (
      <UploadCrawledJobsModal
        onClose={() => setShowUpload(false)}
        onUploaded={() => {
          setShowUpload(false);
          setUploadsPage(1);
          setSelected(null);
          setRevision((value) => value + 1);
        }}
      />
    )}
    <Flex as="header" justify="space-between" align="center" gap="4" mb="8" wrap="wrap">
      <Box>
        <Text as="h1" fontSize="3xl" fontWeight="bold">Manual uploads</Text>
        <Text color="gray.500">Crawled-job payloads uploaded by hand. Their jobs are fetched and processed like a crawl's.</Text>
      </Box>
      <Flex gap="3">
        <Button bg="green.600" color="white" _hover={{ bg: "green.700" }} onClick={() => setShowUpload(true)}>
          <Icon as={Upload} boxSize="4" />
          Upload jobs
        </Button>
        <Button variant="outline" disabled={uploadsLoading || jobsLoading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
      </Flex>
    </Flex>

    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" overflow="hidden" mb="8">
      <Box p="5">
        <Text fontWeight="bold">{uploadsLoading ? "Loading..." : `${uploads?.pagination.total ?? 0} upload(s)`}</Text>
        <Text fontSize="xs" color="gray.500">Newest first. Select an upload to list its jobs below.</Text>
      </Box>
      {uploadsError && <Text role="alert" color="red.600" px="5" pb="4">{uploadsError}</Text>}
      <Box overflowX="auto"><Table.Root size="sm" minW="900px">
        <Table.Header bg="gray.50"><Table.Row>
          {["Uploaded", "Jobs", ...COUNT_COLUMNS.map(([, label]) => label)].map((label) => <Table.ColumnHeader key={label} p="4">{label}</Table.ColumnHeader>)}
        </Table.Row></Table.Header>
        <Table.Body>
          {uploadsLoading || uploadsError || !uploads?.uploads.length
            ? <Table.Row><Table.Cell colSpan={2 + COUNT_COLUMNS.length} p="8" textAlign="center">
              {uploadsLoading ? "Loading uploads..." : uploadsError ? "Unable to load uploads. Use Refresh to retry." : "No jobs have been uploaded yet."}
            </Table.Cell></Table.Row>
            : uploads.uploads.map((upload) => (
              <Table.Row key={upload.id} cursor="pointer" bg={selected === upload.id ? "green.50" : undefined} _hover={{ bg: selected === upload.id ? "green.50" : "gray.50" }} onClick={() => select(upload.id)}>
                <Table.Cell p="4" fontWeight="semibold">{time(upload.uploadedAt)}</Table.Cell>
                <Table.Cell p="4">{upload.total}</Table.Cell>
                {COUNT_COLUMNS.map(([key]) => <Table.Cell key={key} p="4">{upload.counts[key]}</Table.Cell>)}
              </Table.Row>
            ))}
        </Table.Body>
      </Table.Root></Box>
      {uploads && uploads.pagination.totalPages > 1 && (
        <Pager page={uploadsPage} pages={uploads.pagination.totalPages} disabled={uploadsLoading} onChange={setUploadsPage} />
      )}
    </Box>

    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" overflow="hidden">
      <Flex p="5" justify="space-between" align="center" gap="3">
        <Box>
          <Text fontWeight="bold">{jobsLoading ? "Loading..." : `${jobs?.pagination.total ?? 0} job(s) still stored`}</Text>
          <Text fontSize="xs" color="gray.500">
            {selected === null ? "Every upload's" : `The selected upload's (${time(uploads?.uploads.find((upload) => upload.id === selected)?.uploadedAt ?? null)})`}, newest first. Processed uploads keep only their counts.
          </Text>
        </Box>
        {selected !== null && <Button size="sm" variant="outline" onClick={() => select(null)}>Show all uploads' jobs</Button>}
      </Flex>
      {jobsError && <Text role="alert" color="red.600" px="5" pb="4">{jobsError}</Text>}
      <Box overflowX="auto"><Table.Root size="sm" minW="900px">
        <Table.Header bg="gray.50"><Table.Row>
          {["Title", "Company", "Status", "Uploaded"].map((label) => <Table.ColumnHeader key={label} p="4">{label}</Table.ColumnHeader>)}
        </Table.Row></Table.Header>
        <Table.Body>
          {jobsLoading || jobsError || !jobs?.crawledJobs.length
            ? <Table.Row><Table.Cell colSpan={4} p="8" textAlign="center">
              {jobsLoading ? "Loading jobs..." : jobsError ? "Unable to load jobs. Use Refresh to retry." : "No uploaded jobs are waiting or stored."}
            </Table.Cell></Table.Row>
            : jobs.crawledJobs.map((job) => (
              <Table.Row key={job.id} _hover={{ bg: "gray.50" }}>
                <Table.Cell p="4" fontWeight="semibold">{job.title}</Table.Cell>
                <Table.Cell p="4">{job.company}</Table.Cell>
                <Table.Cell p="4"><StatusBadge status={job.status} /></Table.Cell>
                <Table.Cell p="4" color="gray.500">{time(job.createdAt)}</Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
      </Table.Root></Box>
      {jobs && jobs.pagination.totalPages > 1 && (
        <Pager page={jobsPage} pages={jobs.pagination.totalPages} disabled={jobsLoading} onChange={setJobsPage} />
      )}
    </Box>
  </>;
}
