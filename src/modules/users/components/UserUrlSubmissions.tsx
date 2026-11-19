import { useEffect, useState } from "react";
import { Box, Button, Flex, Table, Text } from "@chakra-ui/react";
import { api } from "../../../api";
import { PagePicker } from "../../../components/PagePicker";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { UrlSubmissionFileKind, UserUrlSubmission } from "../../../types";

const time = (value: string | null) => value ? new Date(value).toLocaleString() : "—";

/** The client's URL list uploads (My URLs) with their outcome counts. Each count downloads its URL
 * list; the files are kept 30 days after parsing. */
export function UserUrlSubmissions({ userId }: { userId: number }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.userUrlSubmissions>> | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.userUrlSubmissions(userId, page).then((result) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
      if (page > lastPage) setPage(lastPage);
      else setData(result);
    }).catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : "Unable to load URL submissions"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, page, revision]);
  const download = async (submission: UserUrlSubmission, kind: UrlSubmissionFileKind) => {
    setDownloading(`${submission.id}:${kind}`); setError("");
    try {
      const { blob, fileName } = await api.userUrlSubmissionFile(userId, submission.id, kind);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to download the URL list.");
    } finally { setDownloading(""); }
  };
  const countLink = (submission: UserUrlSubmission, kind: UrlSubmissionFileKind, count: number) =>
    <Button size="xs" variant="ghost" colorPalette="green" textDecoration="underline" disabled={!!downloading || (kind !== "source" && submission.status === "raw")}
      loading={downloading === `${submission.id}:${kind}`} onClick={() => void download(submission, kind)}>{count.toLocaleString()}</Button>;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return <Box bg="white" borderRadius="2xl" p="5" mt="6">
    <Flex justify="space-between" align="center" mb="4">
      <Box>
        <Text fontWeight="bold">URL submissions{data ? ` (${data.total})` : ""}</Text>
        <Text fontSize="xs" color="gray.500">Job URL lists the client uploaded. Click a count to download its URLs (files are kept 30 days after parsing)</Text>
      </Box>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="3">{error}</Text>}
    <Box overflowX="auto"><Table.Root size="sm" minW="900px">
      <Table.Header><Table.Row>{["ID", "File", "Uploaded", "Parsed", "Status", "Total", "Auto-applicable", "Unsupported", "Invalid"].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
      <Table.Body>
        {loading || error || !data?.submissions.length ? <Table.Row><Table.Cell colSpan={9} py="6">{loading ? "Loading URL submissions..." : error ? "Use Refresh to retry." : "No URL submissions yet."}</Table.Cell></Table.Row> : data.submissions.map((submission) => <Table.Row key={submission.id}>
          <Table.Cell fontFamily="mono" color="gray.600">#{submission.id}</Table.Cell>
          <Table.Cell><Button size="xs" variant="ghost" colorPalette="green" textDecoration="underline" disabled={!!downloading} loading={downloading === `${submission.id}:source`} onClick={() => void download(submission, "source")}>{submission.fileName || `upload-${submission.id}.txt`}</Button></Table.Cell>
          <Table.Cell whiteSpace="nowrap">{time(submission.createdAt)}</Table.Cell>
          <Table.Cell whiteSpace="nowrap">{time(submission.parsedAt)}</Table.Cell>
          <Table.Cell><StatusBadge status={submission.status} /></Table.Cell>
          <Table.Cell>{countLink(submission, "total", submission.totalCount)}</Table.Cell>
          <Table.Cell>{countLink(submission, "auto-applicable", submission.autoApplicableCount)}</Table.Cell>
          <Table.Cell>{countLink(submission, "unsupported", submission.unsupportedCount)}</Table.Cell>
          <Table.Cell>{countLink(submission, "invalid", submission.invalidCount)}</Table.Cell>
        </Table.Row>)}
      </Table.Body>
    </Table.Root></Box>
    <Flex mt="4" justify="space-between" align="center" gap="3" wrap="wrap"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2" align="center"><PagePicker page={page} totalPages={pages} onChange={setPage} disabled={loading || !!error} /><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage(page + 1)}>Next</Button></Flex></Flex>
  </Box>;
}
