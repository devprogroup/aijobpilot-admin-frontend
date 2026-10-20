import { useEffect, useState } from "react";
import { Box, Button, Dialog, Flex, Input, NativeSelect, Portal, Table, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { PagePicker } from "../../components/PagePicker";
import type { AdminApplication, ApplicationSite, ApplicationStatus } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ApplicationLogDialog } from "./components/ApplicationLogDialog";
import { useAuth } from "../../auth/AuthContext";
import { todayDateInput } from "../../services/date-filter";

const STATUS_OPTIONS: { value: ApplicationStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "applying", label: "Applying" },
  { value: "applied", label: "Applied" },
  { value: "failed", label: "Failed" },
  { value: "closed", label: "Closed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "declined", label: "Declined" },
];

const linkStyle = { color: "#15803d", textDecoration: "underline" } as const;

// Screenshots need the admin token, so a plain link can't open them. Open the tab synchronously
// (so popup blockers allow it), then point it at the downloaded image once it arrives.
function openScreenshot(applicationId: number, kind: "preview" | "result") {
  const tab = window.open("", "_blank");
  if (tab) tab.document.title = `Application #${applicationId} ${kind === "preview" ? "before submit" : "result"} screenshot`;
  void api.applicationScreenshot(applicationId, kind).then((url) => {
    if (tab && !tab.closed) tab.location.href = url;
    else window.open(url, "_blank");
  }).catch((error: unknown) => {
    tab?.close();
    window.alert(error instanceof Error ? error.message : "Unable to load application screenshot.");
  });
}

function ApplicationFileLinks({ application, onViewLog }: { application: AdminApplication; onViewLog: () => void }) {
  const links = [
    application.logFilePath && { label: "View log", onClick: onViewLog },
    application.previewScreenshot && { label: "Before submit screenshot", onClick: () => openScreenshot(application.id, "preview") },
    application.resultScreenshot && { label: "Result screenshot", onClick: () => openScreenshot(application.id, "result") },
  ].filter((link): link is { label: string; onClick: () => void } => Boolean(link));
  if (!links.length) return <Text color="gray.400">—</Text>;
  return (
    <Flex direction="column" align="flex-start" fontSize="sm" gap="1">
      {links.map((link) => (
        <a key={link.label} href="#" style={linkStyle} onClick={(event) => { event.preventDefault(); event.stopPropagation(); link.onClick(); }}>{link.label}</a>
      ))}
    </Flex>
  );
}

function AuthorizedScreenshot({ applicationId, kind, alt }: { applicationId: number; kind: "preview" | "result"; alt: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    void api.applicationScreenshot(applicationId, kind).then((url) => {
      objectUrl = url;
      if (active) setSrc(url);
      else URL.revokeObjectURL(url);
    }).catch(() => setSrc(""));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [applicationId, kind]);
  return src ? <img src={src} alt={alt} style={{ maxWidth: "320px", borderRadius: "8px", border: "1px solid #e5e7eb" }} /> : <Text fontSize="xs" color="gray.500">Loading screenshot…</Text>;
}

export function AllApplicationsPage() {
  const { user: currentAdmin } = useAuth();
  // The applications API allows technical and super admins to change source and status.
  const canSetSource = currentAdmin?.role === "super_admin" || currentAdmin?.role === "technical";
  const [sourceBusyId, setSourceBusyId] = useState<number | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);
  const [retryBusyId, setRetryBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.applications>> | null>(null);
  const [applicationSites, setApplicationSites] = useState<ApplicationSite[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  // Today's applications by default.
  const [from, setFrom] = useState(todayDateInput);
  const [to, setTo] = useState(todayDateInput);
  const [status, setStatus] = useState<ApplicationStatus | "">("");
  const [applicationSiteId, setApplicationSiteId] = useState("");
  const [userId, setUserId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageModal, setMessageModal] = useState<AdminApplication | null>(null);
  const [logApplicationId, setLogApplicationId] = useState<number | null>(null);

  useEffect(() => {
    api.applicationSites().then((value) => setApplicationSites(value.applicationSites)).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.applications(page, {
      search: query, from, to,
      status: status || undefined,
      applicationSiteId: applicationSiteId ? Number(applicationSiteId) : undefined,
      userId: userId ? Number(userId) : undefined,
      profileId: profileId ? Number(profileId) : undefined,
    }).then((value) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(value.total / value.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setResult(value);
    }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "Unable to load applications");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, from, to, status, applicationSiteId, userId, profileId, revision]);

  const setSource = async (application: AdminApplication, source: AdminApplication["source"]) => {
    if (source === application.source) return;
    setActionError(""); setSourceBusyId(application.id);
    try {
      await api.setApplicationSource(application.id, source);
      setResult((current) => current && {
        ...current,
        applications: current.applications.map((entry) => entry.id === application.id ? { ...entry, source } : entry),
      });
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Unable to change the application source.");
    } finally { setSourceBusyId(null); }
  };

  const setStatus = async (application: AdminApplication, status: ApplicationStatus) => {
    if (status === application.status) return;
    setActionError(""); setStatusBusyId(application.id);
    try {
      await api.setApplicationStatus(application.id, status);
      setResult((current) => current && {
        ...current,
        applications: current.applications.map((entry) => entry.id === application.id ? { ...entry, status } : entry),
      });
      setMessageModal((current) => current?.id === application.id ? { ...current, status } : current);
      setRevision((value) => value + 1);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Unable to change the application status.");
    } finally { setStatusBusyId(null); }
  };

  const retry = async (application: AdminApplication) => {
    setActionError(""); setRetryBusyId(application.id);
    try {
      await api.retryApplication(application.id);
      setResult((current) => current && {
        ...current,
        applications: current.applications.map((entry) => entry.id === application.id
          ? { ...entry, status: "queued", message: null, previewScreenshot: null, resultScreenshot: null }
          : entry),
      });
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Unable to retry the application.");
    } finally { setRetryBusyId(null); }
  };

  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const applyFilters = () => { setQuery(search.trim()); setPage(1); setRevision((value) => value + 1); };
  const clearFilters = () => {
    setSearch(""); setQuery(""); setFrom(""); setTo("");
    setStatus(""); setApplicationSiteId(""); setUserId(""); setProfileId("");
    setPage(1);
  };

  return <>
    <Flex as="header" justify="space-between" align="center" gap="4" mb="8">
      <Box><Text as="h1" fontSize="3xl" fontWeight="bold">All applications</Text><Text color="gray.500">Browse every application and filter by status, site, user or profile.</Text></Box>
      <Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    <Flex as="form" gap="3" mb="3" wrap="wrap" onSubmit={(event) => { event.preventDefault(); applyFilters(); }}>
      <Input aria-label="Search applications" maxLength={200} placeholder="Search job, company, user, profile, ID or message" value={search} onChange={(event) => setSearch(event.target.value)} bg="white" flex="1" minW="56" />
      <Input aria-label="From date" type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setPage(1); }} bg="white" w="44" />
      <Input aria-label="To date" type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1); }} bg="white" w="44" />
      <Button type="submit" disabled={loading}>Search</Button>
      <Button variant="outline" onClick={clearFilters}>Clear</Button>
    </Flex>
    <Flex gap="3" mb="5" wrap="wrap">
      <NativeSelect.Root maxW="44" bg="white"><NativeSelect.Field aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as ApplicationStatus | ""); setPage(1); }}>
        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
      <NativeSelect.Root maxW="56" bg="white"><NativeSelect.Field aria-label="Filter by application site" value={applicationSiteId} onChange={(event) => { setApplicationSiteId(event.target.value); setPage(1); }}>
        <option value="">All application sites</option>
        {applicationSites.map((site) => <option key={site.id} value={site.id}>{site.displayText}</option>)}
      </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
      <Input aria-label="Filter by user ID" placeholder="User ID" value={userId} onChange={(event) => { setUserId(event.target.value.replace(/\D/g, "")); setPage(1); }} bg="white" w="32" />
      <Input aria-label="Filter by profile ID" placeholder="Profile ID" value={profileId} onChange={(event) => { setProfileId(event.target.value.replace(/\D/g, "")); setPage(1); }} bg="white" w="32" />
    </Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
    {actionError && <Text role="alert" color="red.600" mb="4">{actionError}</Text>}
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" overflow="hidden">
      <Box p="5"><Text fontWeight="bold">{loading ? "Loading..." : error ? "Applications" : `${result?.total ?? 0} applications`}</Text><Text fontSize="xs" color="gray.500">Most recently created first</Text></Box>
      <Box overflowX="auto"><Table.Root size="sm" minW="1200px">
        <Table.Header bg="gray.50"><Table.Row>{["Application", "Job / company", "Site", "Source", "User", "Profile", "Created", "Applied", "Log & screenshots"].map((label) => <Table.ColumnHeader key={label} p="4">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
        <Table.Body>
          {loading || error || !result?.applications.length ? <Table.Row><Table.Cell colSpan={9} p="8" textAlign="center">{loading ? "Loading applications..." : error ? "Unable to load applications. Use Refresh to retry." : "No applications match your filters."}</Table.Cell></Table.Row> : result.applications.map((application) => <Table.Row key={application.id} cursor="pointer" _hover={{ bg: "gray.50" }} onClick={() => setMessageModal(application)}>
            <Table.Cell p="4" onClick={(event) => event.stopPropagation()}>
              <Text mb="2">#{application.id}</Text><StatusBadge status={application.status} />
              {canSetSource && <NativeSelect.Root mt="2" size="sm" minW="32" disabled={statusBusyId !== null}>
                <NativeSelect.Field aria-label={`Status of application #${application.id}`} value={application.status} onChange={(event) => void setStatus(application, event.target.value as ApplicationStatus)}>
                  {STATUS_OPTIONS.filter((option) => option.value !== "").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>}
              {application.status === "failed" && canSetSource && (
                <Button mt="2" size="xs" variant="outline" colorPalette="green" display="block"
                  loading={retryBusyId === application.id} disabled={retryBusyId !== null}
                  onClick={(event) => { event.stopPropagation(); void retry(application); }}>
                  Retry
                </Button>
              )}
            </Table.Cell>
            <Table.Cell p="4">
              <Text fontWeight="semibold">
                {application.job?.url ? (
                  <a
                    href={application.job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    style={{ color: "#15803d", textDecoration: "underline" }}
                  >
                    {application.job.positionName || "Job unavailable"}
                  </a>
                ) : application.job?.positionName || "Job unavailable"}
              </Text>
              <Text fontSize="xs" color="gray.500">{application.job?.companyName || "—"}</Text>
              {application.job?.url && <Text fontSize="xs"><a href={application.job.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} style={{ color: "#15803d", textDecoration: "underline" }}>View posting</a></Text>}
            </Table.Cell>
            <Table.Cell p="4">{application.job?.applicationSite?.displayText || "—"}</Table.Cell>
            {/* Clicks stay here: the row itself opens the message dialog. */}
            <Table.Cell p="4" onClick={(event) => event.stopPropagation()}>
              <NativeSelect.Root size="sm" minW="28" disabled={!canSetSource || sourceBusyId === application.id}>
                <NativeSelect.Field aria-label={`Source of application #${application.id}`} value={application.source} onChange={(event) => void setSource(application, event.target.value as AdminApplication["source"])}>
                  <option value="auto">Auto</option>
                  <option value="manual">Manual</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Table.Cell>
            <Table.Cell p="4">{application.user ? <Link to={`/users/clients/${application.user.id}`} onClick={(event) => event.stopPropagation()} style={{ color: "#15803d", textDecoration: "underline" }}>{application.user.name || application.user.username}</Link> : "—"}</Table.Cell>
            <Table.Cell p="4">{application.profile?.name || (application.profile ? `Profile #${application.profile.id}` : "—")}</Table.Cell>
            <Table.Cell p="4">{new Date(application.createdAt).toLocaleString()}</Table.Cell>
            <Table.Cell p="4">{application.appliedAt ? new Date(application.appliedAt).toLocaleString() : "—"}</Table.Cell>
            <Table.Cell p="4" whiteSpace="nowrap"><ApplicationFileLinks application={application} onViewLog={() => setLogApplicationId(application.id)} /></Table.Cell>
          </Table.Row>)}
        </Table.Body>
      </Table.Root></Box>
      <Flex p="4" justify="space-between" align="center" gap="3" wrap="wrap"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2" align="center"><PagePicker page={page} totalPages={pages} onChange={setPage} disabled={loading || !!error} /><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></Flex></Flex>
    </Box>
    {messageModal && <Dialog.Root open scrollBehavior="inside" onOpenChange={({ open }) => { if (!open) setMessageModal(null); }}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="2xl" borderRadius="2xl">
            <Dialog.Header><Dialog.Title>Application #{messageModal.id} details</Dialog.Title></Dialog.Header>
            <Dialog.Body>
              <Text fontSize="sm" fontWeight="semibold" mb="2">Status</Text>
              <Box mb="5"><StatusBadge status={messageModal.status} /></Box>
              <Text fontSize="sm" fontWeight="semibold" mb="2">Message</Text>
              <Box mb="5" p="3" bg="gray.50" borderRadius="lg" maxH="48" overflowY="auto" whiteSpace="pre-wrap" overflowWrap="anywhere" fontSize="sm">
                {messageModal.message || "No message recorded."}
              </Box>
              {(messageModal.previewScreenshot || messageModal.resultScreenshot) && <>
                <Text fontSize="sm" fontWeight="semibold" mb="2">Screenshots</Text>
                <Flex gap="4" flexWrap="wrap">
                  {messageModal.previewScreenshot && <Box>
                    <Text fontSize="xs" color="gray.500" mb="1">Before submit</Text>
                    <AuthorizedScreenshot applicationId={messageModal.id} kind="preview" alt="Preview screenshot" />
                    <Text fontSize="xs" mt="1"><a href="#" style={linkStyle} onClick={(event) => { event.preventDefault(); openScreenshot(messageModal.id, "preview"); }}>Open full size</a></Text>
                  </Box>}
                  {messageModal.resultScreenshot && <Box>
                    <Text fontSize="xs" color="gray.500" mb="1">Result</Text>
                    <AuthorizedScreenshot applicationId={messageModal.id} kind="result" alt="Result screenshot" />
                    <Text fontSize="xs" mt="1"><a href="#" style={linkStyle} onClick={(event) => { event.preventDefault(); openScreenshot(messageModal.id, "result"); }}>Open full size</a></Text>
                  </Box>}
                </Flex>
              </>}
            </Dialog.Body>
            <Dialog.Footer>
              {messageModal.logFilePath && <Button variant="outline" onClick={() => { setLogApplicationId(messageModal.id); setMessageModal(null); }}>View log</Button>}
              <Button variant="outline" onClick={() => setMessageModal(null)}>Close</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>}
    {logApplicationId !== null && <ApplicationLogDialog applicationId={logApplicationId} onClose={() => setLogApplicationId(null)} />}
  </>;
}
