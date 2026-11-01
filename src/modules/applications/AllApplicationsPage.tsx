import { useEffect, useState, type ReactNode } from "react";
import { Box, Button, Dialog, Flex, IconButton, Input, NativeSelect, Portal, Table, Text, chakra } from "@chakra-ui/react";
import { ArrowDown, ArrowUp, Camera, ChevronsUpDown, FileText, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { PagePicker } from "../../components/PagePicker";
import type { AdminApplication, ApplicationFilterProfile, ApplicationFilterUser, ApplicationSite, ApplicationSortKey, ApplicationStatus } from "../../types";
import { ApplicationLogDialog } from "./components/ApplicationLogDialog";
import { CompanyLogo, Hint } from "./components/CompanyLogo";
import { DateRangeFilter } from "./components/DateRangeFilter";
import { UserFilterCombobox } from "./components/UserFilterCombobox";
import { useAuth } from "../../auth/AuthContext";
import { dateFilterRange, todayDateInput } from "../../services/date-filter";

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

// Always three slots, so the icons line up from row to row; a missing file is a dimmed icon.
function ApplicationFileLinks({ application, onViewLog }: { application: AdminApplication; onViewLog: () => void }) {
  const links = [
    { label: "View log", missing: "No log", icon: FileText, available: Boolean(application.logFilePath), onClick: onViewLog },
    { label: "Before submit screenshot", missing: "No before submit screenshot", icon: Camera, available: Boolean(application.previewScreenshot), onClick: () => openScreenshot(application.id, "preview") },
    { label: "Result screenshot", missing: "No result screenshot", icon: ImageIcon, available: Boolean(application.resultScreenshot), onClick: () => openScreenshot(application.id, "result") },
  ];
  return (
    <Flex gap="0.5">
      {links.map((link) => (
        <Hint key={link.label} label={link.available ? link.label : link.missing}>
          {/* A disabled button fires no hover events, so the hint sits on this wrapper. */}
          <chakra.span display="inline-flex">
            <IconButton aria-label={`${link.label} of application #${application.id}`} size="2xs" variant="ghost" color="green.700" disabled={!link.available} onClick={(event) => { event.stopPropagation(); link.onClick(); }}>
              <link.icon size={15} />
            </IconButton>
          </chakra.span>
        </Hint>
      ))}
    </Flex>
  );
}

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric", year: "2-digit", hour: "numeric", minute: "2-digit" });

/** A compact date with the full timestamp on hover. */
function CompactDate({ value }: { value: string | null }) {
  if (!value) return <Text color="gray.400">—</Text>;
  return <chakra.span title={new Date(value).toLocaleString()} whiteSpace="nowrap">{dateFormat.format(new Date(value))}</chakra.span>;
}

/** One line, cut off with an ellipsis; the full text shows on hover. */
function Truncated({ text, maxW, children }: { text: string; maxW: string; children?: ReactNode }) {
  return <Box title={text} maxW={maxW} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{children ?? text}</Box>;
}

type Column = { label: string; sort?: ApplicationSortKey; firstDir?: "asc" | "desc" };
const COLUMNS: Column[] = [
  { label: "ID", sort: "id", firstDir: "desc" },
  { label: "Status", sort: "status" },
  { label: "Actions" },
  { label: "Job", sort: "job" },
  { label: "Company", sort: "company" },
  { label: "Site", sort: "site" },
  { label: "Source", sort: "source" },
  { label: "User", sort: "user" },
  { label: "Profile", sort: "profile" },
  { label: "Created", sort: "createdAt", firstDir: "desc" },
  { label: "Applied", sort: "appliedAt", firstDir: "desc" },
  { label: "Files" },
];
const DEFAULT_SORT = { by: "createdAt" as ApplicationSortKey, dir: "desc" as "asc" | "desc" };

/** Waits for a pause in typing before a text filter hits the API. */
function useDebounced(value: string, delayMs = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const filterInputProps = { size: "xs", bg: "white", fontWeight: "normal" } as const;

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
  const [cancelBusyId, setCancelBusyId] = useState<number | null>(null);
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
  const [idFilter, setIdFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<AdminApplication["source"] | "">("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [filterUser, setFilterUser] = useState<ApplicationFilterUser | null>(null);
  const [userProfiles, setUserProfiles] = useState<ApplicationFilterProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const debouncedId = useDebounced(idFilter);
  const debouncedJob = useDebounced(jobFilter);
  const debouncedCompany = useDebounced(companyFilter);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageModal, setMessageModal] = useState<AdminApplication | null>(null);
  const [logApplicationId, setLogApplicationId] = useState<number | null>(null);

  useEffect(() => {
    api.applicationSites().then((value) => setApplicationSites(value.applicationSites)).catch(() => undefined);
  }, []);

  // A profile only makes sense under its user, so choosing or clearing the user resets it.
  useEffect(() => {
    setProfileId(""); setUserProfiles([]);
    if (!filterUser) return;
    let active = true;
    api.applicationFilterProfiles(filterUser.id).then((value) => { if (active) setUserProfiles(value.profiles); }).catch(() => undefined);
    return () => { active = false; };
  }, [filterUser]);

  useEffect(() => { setPage(1); }, [debouncedId, debouncedJob, debouncedCompany]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const dateRange = dateFilterRange(from, to);
    const appliedRange = dateFilterRange(appliedFrom, appliedTo);
    api.applications(page, {
      search: query, ...dateRange,
      status: status || undefined,
      applicationSiteId: applicationSiteId ? Number(applicationSiteId) : undefined,
      userId: filterUser?.id,
      profileId: profileId ? Number(profileId) : undefined,
      id: debouncedId || undefined,
      job: debouncedJob || undefined,
      company: debouncedCompany || undefined,
      source: sourceFilter || undefined,
      appliedFrom: appliedRange.from,
      appliedTo: appliedRange.to,
      sortBy: sort.by,
      sortDir: sort.dir,
    }).then((value) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(value.total / value.pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setResult(value);
    }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "Unable to load applications");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, from, to, status, applicationSiteId, filterUser, profileId, debouncedId, debouncedJob, debouncedCompany, sourceFilter, appliedFrom, appliedTo, sort, revision]);

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

  const changeStatus = async (application: AdminApplication, status: ApplicationStatus) => {
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

  // Deletes the queued/failed application and returns its job to the profile's recommended list.
  const cancel = async (application: AdminApplication) => {
    if (!window.confirm(`Cancel application #${application.id}? It is deleted and the job goes back to the profile's recommended jobs.`)) return;
    setActionError(""); setCancelBusyId(application.id);
    try {
      await api.cancelApplication(application.id);
      setResult((current) => current && {
        ...current,
        total: Math.max(0, current.total - 1),
        applications: current.applications.filter((entry) => entry.id !== application.id),
      });
      setMessageModal((current) => current?.id === application.id ? null : current);
      setRevision((value) => value + 1);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Unable to cancel the application.");
    } finally { setCancelBusyId(null); }
  };

  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const applyFilters = () => { setQuery(search.trim()); setPage(1); setRevision((value) => value + 1); };
  const clearFilters = () => {
    setSearch(""); setQuery(""); setFrom(""); setTo("");
    setStatus(""); setApplicationSiteId(""); setFilterUser(null); setProfileId("");
    setIdFilter(""); setJobFilter(""); setCompanyFilter(""); setSourceFilter(""); setAppliedFrom(""); setAppliedTo("");
    setSort(DEFAULT_SORT);
    setPage(1);
  };
  const toggleSort = (column: Column) => {
    if (!column.sort) return;
    const by = column.sort;
    setSort((current) => current.by === by
      ? { by, dir: current.dir === "asc" ? "desc" : "asc" }
      : { by, dir: column.firstDir ?? "asc" });
    setPage(1);
  };
  const sortLabel = COLUMNS.find((column) => column.sort === sort.by)?.label ?? "";

  return <>
    <Flex as="header" justify="space-between" align="center" gap="4" mb="8">
      <Box><Text as="h1" fontSize="3xl" fontWeight="bold">All applications</Text><Text color="gray.500">Browse every application; filter and sort from the column headers.</Text></Box>
      <Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    <Flex as="form" gap="3" mb="5" wrap="wrap" onSubmit={(event) => { event.preventDefault(); applyFilters(); }}>
      <Input aria-label="Search applications" maxLength={200} placeholder="Search job, company, user, profile, ID or message" value={search} onChange={(event) => setSearch(event.target.value)} bg="white" flex="1" minW="56" />
      <Button type="submit" disabled={loading}>Search</Button>
      <Button variant="outline" onClick={clearFilters}>Clear</Button>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
    {actionError && <Text role="alert" color="red.600" mb="4">{actionError}</Text>}
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" overflow="hidden">
      <Flex px="4" py="3" align="baseline" gap="2"><Text fontWeight="bold">{loading ? "Loading..." : error ? "Applications" : `${result?.total ?? 0} applications`}</Text><Text fontSize="xs" color="gray.500">Sorted by {sortLabel}, {sort.dir === "asc" ? "ascending" : "descending"}</Text></Flex>
      <Box overflowX="auto"><Table.Root size="sm" fontSize="13px" css={{ "& td, & th": { paddingInline: "6px", paddingBlock: "4px" }, "& input, & select": { fontSize: "13px" } }}>
        <Table.Header bg="gray.50">
          <Table.Row>{COLUMNS.map((column) => {
            const sorted = column.sort && sort.by === column.sort;
            return <Table.ColumnHeader key={column.label} whiteSpace="nowrap" fontSize="13px" aria-sort={sorted ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
              {column.sort ? <chakra.button type="button" display="inline-flex" alignItems="center" gap="1" cursor="pointer" fontWeight="semibold" _hover={{ color: "green.700" }} color={sorted ? "green.700" : undefined} onClick={() => toggleSort(column)}>
                {column.label}
                {sorted ? (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} color="#9ca3af" />}
              </chakra.button> : column.label}
            </Table.ColumnHeader>;
          })}</Table.Row>
          <Table.Row>
            <Table.ColumnHeader><Input {...filterInputProps} w="16" aria-label="Filter by application ID" placeholder="ID" inputMode="numeric" value={idFilter} onChange={(event) => setIdFilter(event.target.value.replace(/\D/g, ""))} /></Table.ColumnHeader>
            <Table.ColumnHeader><NativeSelect.Root size="xs" w="24" bg="white"><NativeSelect.Field aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as ApplicationStatus | ""); setPage(1); }}>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.value ? option.label : "All"}</option>)}
            </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Table.ColumnHeader>
            <Table.ColumnHeader />
            <Table.ColumnHeader><Input {...filterInputProps} minW="32" aria-label="Filter by job title" placeholder="Job title" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} /></Table.ColumnHeader>
            <Table.ColumnHeader><Input {...filterInputProps} w="20" aria-label="Filter by company name" placeholder="Company" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} /></Table.ColumnHeader>
            <Table.ColumnHeader><NativeSelect.Root size="xs" w="24" bg="white"><NativeSelect.Field aria-label="Filter by application site" value={applicationSiteId} onChange={(event) => { setApplicationSiteId(event.target.value); setPage(1); }}>
              <option value="">All</option>
              {applicationSites.map((site) => <option key={site.id} value={site.id}>{site.displayText}</option>)}
            </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Table.ColumnHeader>
            <Table.ColumnHeader><NativeSelect.Root size="xs" w="20" bg="white"><NativeSelect.Field aria-label="Filter by source" value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value as AdminApplication["source"] | ""); setPage(1); }}>
              <option value="">All</option>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Table.ColumnHeader>
            <Table.ColumnHeader><UserFilterCombobox user={filterUser} onChange={(user) => { setFilterUser(user); setPage(1); }} /></Table.ColumnHeader>
            <Table.ColumnHeader><NativeSelect.Root size="xs" w="28" bg="white" disabled={!filterUser}><NativeSelect.Field aria-label="Filter by profile" title={filterUser ? undefined : "Choose a user first"} value={profileId} onChange={(event) => { setProfileId(event.target.value); setPage(1); }}>
              <option value="">{filterUser ? "All" : "Choose user"}</option>
              {userProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name || `Profile #${profile.id}`}{profile.isDeleted ? " (deleted)" : ""}</option>)}
            </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Table.ColumnHeader>
            <Table.ColumnHeader><DateRangeFilter label="Created" from={from} to={to} onChange={(start, end) => { setFrom(start); setTo(end); setPage(1); }} /></Table.ColumnHeader>
            <Table.ColumnHeader><DateRangeFilter label="Applied" from={appliedFrom} to={appliedTo} onChange={(start, end) => { setAppliedFrom(start); setAppliedTo(end); setPage(1); }} /></Table.ColumnHeader>
            <Table.ColumnHeader />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loading || error || !result?.applications.length ? <Table.Row><Table.Cell colSpan={COLUMNS.length} p="8" textAlign="center">{loading ? "Loading applications..." : error ? "Unable to load applications. Use Refresh to retry." : "No applications match your filters."}</Table.Cell></Table.Row> : result.applications.map((application) => <Table.Row key={application.id} cursor="pointer" _hover={{ bg: "gray.50" }} onClick={() => setMessageModal(application)}>
            <Table.Cell whiteSpace="nowrap" onClick={(event) => event.stopPropagation()}>#{application.id}</Table.Cell>
            <Table.Cell onClick={(event) => event.stopPropagation()}>
              {canSetSource ? <NativeSelect.Root size="xs" w="24" disabled={statusBusyId !== null}>
                <NativeSelect.Field aria-label={`Status of application #${application.id}`} value={application.status} onChange={(event) => void changeStatus(application, event.target.value as ApplicationStatus)}>
                  {STATUS_OPTIONS.filter((option) => option.value !== "").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root> : <Text textTransform="capitalize">{application.status}</Text>}
            </Table.Cell>
            <Table.Cell onClick={(event) => event.stopPropagation()}>
              {canSetSource && (application.status === "failed" || application.status === "queued") ? (
                <Flex gap="2">
                  {application.status === "failed" && (
                    <Button size="2xs" variant="outline" colorPalette="green"
                      loading={retryBusyId === application.id} disabled={retryBusyId !== null || cancelBusyId === application.id}
                      onClick={(event) => { event.stopPropagation(); void retry(application); }}>
                      Retry
                    </Button>
                  )}
                  <Button size="2xs" variant="outline" colorPalette="red"
                    loading={cancelBusyId === application.id} disabled={cancelBusyId !== null || retryBusyId === application.id}
                    onClick={(event) => { event.stopPropagation(); void cancel(application); }}>
                    Cancel
                  </Button>
                </Flex>
              ) : <Text color="gray.400">—</Text>}
            </Table.Cell>
            <Table.Cell fontWeight="semibold">
              <Truncated text={application.job?.positionName || "Job unavailable"} maxW="60">
                {application.job?.url ? (
                  <a
                    href={application.job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    style={linkStyle}
                  >
                    {application.job.positionName || "Job unavailable"}
                  </a>
                ) : undefined}
              </Truncated>
            </Table.Cell>
            <Table.Cell><CompanyLogo name={application.job?.company?.name || application.job?.companyName} logo={application.job?.company?.logo} /></Table.Cell>
            <Table.Cell><Truncated text={application.job?.applicationSite?.displayText || "—"} maxW="28" /></Table.Cell>
            {/* Clicks stay here: the row itself opens the message dialog. */}
            <Table.Cell onClick={(event) => event.stopPropagation()}>
              <NativeSelect.Root size="xs" w="20" disabled={!canSetSource || sourceBusyId === application.id}>
                <NativeSelect.Field aria-label={`Source of application #${application.id}`} value={application.source} onChange={(event) => void setSource(application, event.target.value as AdminApplication["source"])}>
                  <option value="auto">Auto</option>
                  <option value="manual">Manual</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Table.Cell>
            <Table.Cell>{application.user ? <Truncated text={application.user.name || application.user.username} maxW="32"><Link to={`/users/clients/${application.user.id}`} onClick={(event) => event.stopPropagation()} style={linkStyle}>{application.user.name || application.user.username}</Link></Truncated> : "—"}</Table.Cell>
            <Table.Cell><Truncated text={application.profile?.name || (application.profile ? `Profile #${application.profile.id}` : "—")} maxW="28" /></Table.Cell>
            <Table.Cell><CompactDate value={application.createdAt} /></Table.Cell>
            <Table.Cell><CompactDate value={application.appliedAt} /></Table.Cell>
            <Table.Cell onClick={(event) => event.stopPropagation()}><ApplicationFileLinks application={application} onViewLog={() => setLogApplicationId(application.id)} /></Table.Cell>
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
              <Text mb="5" textTransform="capitalize">{messageModal.status}</Text>
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
