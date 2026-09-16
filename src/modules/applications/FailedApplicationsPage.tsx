import { useEffect, useState } from "react";
import { Box, Button, Dialog, Flex, Input, Portal, Table, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { StatusBadge } from "../../components/ui/StatusBadge";

type FailedApplication = Awaited<ReturnType<typeof api.failedApplications>>["applications"][number];

export function FailedApplicationsPage() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.failedApplications>> | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageModal, setMessageModal] = useState<FailedApplication | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.failedApplications(page, query, from, to).then((value) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(value.total / value.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setResult(value);
    }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "Unable to load failed applications");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, from, to, revision]);
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  return <>
    <Flex as="header" justify="space-between" align="center" gap="4" mb="8">
      <Box><Text as="h1" fontSize="3xl" fontWeight="bold">Failed applications</Text><Text color="gray.500">Review unsuccessful applications and their failure messages.</Text></Box>
      <Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    <Flex as="form" gap="3" mb="5" wrap="wrap" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(1); setRevision((value) => value + 1); }}>
      <Input aria-label="Search failed applications" maxLength={200} placeholder="Search job, company, user, profile, ID or failure message" value={search} onChange={(event) => setSearch(event.target.value)} bg="white" flex="1" minW="56" />
      <Input aria-label="From date" type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setPage(1); }} bg="white" w="44" />
      <Input aria-label="To date" type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1); }} bg="white" w="44" />
      <Button type="submit" disabled={loading}>Search</Button>
      <Button variant="outline" onClick={() => { setSearch(""); setQuery(""); setFrom(""); setTo(""); setPage(1); }}>Clear</Button>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" overflow="hidden">
      <Box p="5"><Text fontWeight="bold">{loading ? "Loading..." : error ? "Failed applications" : `${result?.total ?? 0} failed applications`}</Text><Text fontSize="xs" color="gray.500">Most recently updated first</Text></Box>
      <Box overflowX="auto"><Table.Root size="sm" minW="1100px">
        <Table.Header bg="gray.50"><Table.Row>{["Application", "Job / company", "User", "Profile", "Details", "Last updated"].map((label) => <Table.ColumnHeader key={label} p="4">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
        <Table.Body>
          {loading || error || !result?.applications.length ? <Table.Row><Table.Cell colSpan={6} p="8" textAlign="center">{loading ? "Loading failed applications..." : error ? "Unable to load applications. Use Refresh to retry." : query ? "No failed applications match your search." : "No failed applications."}</Table.Cell></Table.Row> : result.applications.map((application) => <Table.Row key={application.id}>
            <Table.Cell p="4"><Text mb="2">#{application.id}</Text><StatusBadge status={application.status} /></Table.Cell>
            <Table.Cell p="4">
              <Text fontWeight="semibold">{application.job?.positionName || "Job unavailable"}</Text>
              <Text fontSize="xs" color="gray.500">{application.job?.companyName || "—"}</Text>
              {application.job?.applicationSite?.typeName && <Text fontSize="xs" color="gray.500">{application.job.applicationSite.typeName}</Text>}
              {application.job?.url && <Text fontSize="xs"><a href={application.job.url} target="_blank" rel="noreferrer" style={{ color: "#15803d", textDecoration: "underline" }}>View posting</a></Text>}
            </Table.Cell>
            <Table.Cell p="4">{application.user ? <Link to={`/users/${application.user.id}`} style={{ color: "#15803d", textDecoration: "underline" }}>{application.user.name || application.user.username}</Link> : "—"}</Table.Cell>
            <Table.Cell p="4">{application.profile?.name || (application.profile ? `Profile #${application.profile.id}` : "—")}</Table.Cell>
            <Table.Cell p="4"><Button size="sm" variant="outline" onClick={() => setMessageModal(application)}>View details</Button></Table.Cell>
            <Table.Cell p="4">{new Date(application.updatedAt).toLocaleString()}</Table.Cell>
          </Table.Row>)}
        </Table.Body>
      </Table.Root></Box>
      <Flex p="4" justify="space-between" align="center"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2"><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></Flex></Flex>
    </Box>
    {messageModal && <Dialog.Root open scrollBehavior="inside" onOpenChange={({ open }) => { if (!open) setMessageModal(null); }}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="2xl" borderRadius="2xl">
            <Dialog.Header><Dialog.Title>Application #{messageModal.id} failure details</Dialog.Title></Dialog.Header>
            <Dialog.Body>
              <Text fontSize="sm" fontWeight="semibold" mb="2">Failure message</Text>
              <Box mb="5" p="3" bg="gray.50" borderRadius="lg" maxH="48" overflowY="auto" whiteSpace="pre-wrap" overflowWrap="anywhere" fontSize="sm">
                {messageModal.message || "No failure message recorded."}
              </Box>
              {(messageModal.previewScreenshot || messageModal.resultScreenshot) && <>
                <Text fontSize="sm" fontWeight="semibold" mb="2">Screenshots</Text>
                <Flex gap="4" flexWrap="wrap">
                  {messageModal.previewScreenshot && <Box>
                    <Text fontSize="xs" color="gray.500" mb="1">Before submit</Text>
                    <img src={api.applicationScreenshotUrl(messageModal.id, "preview")} alt="Preview screenshot" style={{ maxWidth: "320px", borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                  </Box>}
                  {messageModal.resultScreenshot && <Box>
                    <Text fontSize="xs" color="gray.500" mb="1">Result</Text>
                    <img src={api.applicationScreenshotUrl(messageModal.id, "result")} alt="Result screenshot" style={{ maxWidth: "320px", borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                  </Box>}
                </Flex>
              </>}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setMessageModal(null)}>Close</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>}
  </>;
}
