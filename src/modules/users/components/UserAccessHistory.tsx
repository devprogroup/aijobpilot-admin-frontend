import { useEffect, useState } from "react";
import { Badge, Box, Button, Flex, Table, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { api } from "../../../api";
import { PagePicker } from "../../../components/PagePicker";
import type { UserAccessHistory as AccessHistory } from "../../../types";

const EVENT_LABELS: Record<string, string> = {
  register: "Signed up",
  login: "Signed in",
  login_failed: "Failed sign-in",
  password_reset: "Password reset",
  password_changed: "Password changed",
  email_verified: "Email verified",
  active: "Active",
};
const DETAIL_LABELS: Record<string, string> = {
  wrong_password: "wrong password",
  email_not_verified: "email not verified",
};
const SOURCE_LABELS: Record<string, string> = {
  cloudflare: "via Cloudflare",
  cloudflare_unverified: "Cloudflare header, unverified",
  proxy: "via proxy",
  socket: "direct",
};

const time = (value: string) => new Date(value).toLocaleString();
const place = (city: string | null, region: string | null, country: string | null) =>
  [city, region, country].filter(Boolean).join(", ") || "—";
const deviceLabel = (row: { browser: string | null; os: string | null; deviceType: string | null; device: string | null }) =>
  [row.browser, row.os && `on ${row.os}`].filter(Boolean).join(" ") || "Unknown browser";
const deviceKind = (row: { deviceType: string | null; device: string | null }) =>
  [row.deviceType, row.device].filter(Boolean).join(" · ") || null;

const yesOrDash = (value: string | number | null | undefined) => (value === null || value === undefined || value === "" ? "—" : value);

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string | null }) {
  return <Box flex="1" minW="170px" border="1px solid" borderColor="gray.200" borderRadius="lg" p="3">
    <Text fontSize="xs" color="gray.500">{label}</Text>
    <Text fontWeight="semibold">{value}</Text>
    {hint && <Text fontSize="xs" color="gray.500">{hint}</Text>}
  </Box>;
}

/** The client's sign-ins and activity with IP, location and device, plus a summary, its device
 * fingerprints and the IPs it used (flagging ones other accounts used too) and its devices. */
export function UserAccessHistory({ userId }: { userId: number }) {
  const [data, setData] = useState<AccessHistory | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.userAccessEvents(userId, page).then((result) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
      if (page > lastPage) setPage(lastPage);
      else setData(result);
    }).catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : "Unable to load access history"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, page, revision]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const sharedIps = data?.ips.filter((ip) => ip.otherUsers.length) ?? [];
  const sharedFingerprints = data?.fingerprints.filter((fingerprint) => fingerprint.otherUsers.length) ?? [];
  const first = data?.summary.first;

  return <Box bg="white" borderRadius="2xl" p="5" mt="6">
    <Flex justify="space-between" align="center" mb="4">
      <Box>
        <Text fontWeight="bold">Access history{data ? ` (${data.total})` : ""}</Text>
        <Text fontSize="xs" color="gray.500">Sign-ins, failed sign-ins, password changes and activity (at most every 30 minutes per IP and browser)</Text>
      </Box>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="3">{error}</Text>}

    {data && <Flex gap="3" wrap="wrap" mb="4">
      <Stat label="Last seen" value={data.summary.lastSeen ? time(data.summary.lastSeen) : "—"} />
      <Stat label="Last sign-in" value={data.summary.lastLogin ? time(data.summary.lastLogin) : "—"} hint={data.summary.lastLogin ? null : "Not since tracking started"} />
      <Stat label="First recorded" value={first ? time(first.at) : "—"} hint={first ? `${EVENT_LABELS[first.event] ?? first.event} from ${first.ip || "unknown IP"}${first.country ? ` (${place(first.city, first.region, first.country)})` : ""}` : null} />
      <Stat label={`IPs (${data.summaryDays} days)`} value={data.summary.ipCount} hint={`${data.summary.countryCount} ${data.summary.countryCount === 1 ? "country" : "countries"}`} />
      <Stat label="Device fingerprints" value={data.fingerprints.length} />
      <Stat label={`Failed sign-ins (${data.summaryDays} days)`} value={data.summary.failedLogins} />
    </Flex>}

    {data && sharedFingerprints.length > 0 && <Box border="1px solid" borderColor="red.200" bg="red.50" borderRadius="lg" p="3" mb="4">
      <Text fontWeight="semibold" color="red.800" fontSize="sm">
        {sharedFingerprints.length === 1 ? "1 device fingerprint" : `${sharedFingerprints.length} device fingerprints`} of this client {sharedFingerprints.length === 1 ? "was" : "were"} also reported by other accounts
      </Text>
      <Text fontSize="xs" color="red.800">A strong hint of one device, not proof: identical machines can share a fingerprint.</Text>
      {sharedFingerprints.map((fingerprint) => <Text key={fingerprint.visitorId} fontSize="sm" color="red.900" mt="1">
        <Text as="span" fontFamily="mono">{fingerprint.visitorId.slice(0, 12)}</Text>{": "}
        {fingerprint.otherUsers.map((other, index) => <span key={other.id}>{index > 0 && ", "}<Link to={`/users/clients/${other.id}`} style={{ textDecoration: "underline" }}>{other.name || other.email || `#${other.id}`}</Link></span>)}
      </Text>)}
    </Box>}

    {data && sharedIps.length > 0 && <Box border="1px solid" borderColor="orange.200" bg="orange.50" borderRadius="lg" p="3" mb="4">
      <Text fontWeight="semibold" color="orange.800" fontSize="sm">
        {sharedIps.length === 1 ? "1 IP address" : `${sharedIps.length} IP addresses`} of this client {sharedIps.length === 1 ? "was" : "were"} also used by other accounts in the last {data.summaryDays} days
      </Text>
      {sharedIps.map((ip) => <Text key={ip.ip} fontSize="sm" color="orange.900" mt="1">
        <Text as="span" fontFamily="mono">{ip.ip}</Text>{": "}
        {ip.otherUsers.map((other, index) => <span key={other.id}>{index > 0 && ", "}<Link to={`/users/clients/${other.id}`} style={{ textDecoration: "underline" }}>{other.name || other.email || `#${other.id}`}</Link></span>)}
      </Text>)}
    </Box>}

    {data && <Box mb="5" overflowX="auto">
      <Text fontSize="sm" fontWeight="semibold">Device fingerprints</Text>
      <Text fontSize="xs" color="gray.500" mb="2">Stays the same across IPs and VPNs. A browser update can change it, and a new one appears after the client's next page load.</Text>
      <Table.Root size="sm" minW="1000px"><Table.Header><Table.Row>{["Fingerprint", "Browser", "Graphics", "Screen", "Timezone", "Last IP", "Sessions", "First seen", "Last seen", "Other accounts", "All signals"].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header><Table.Body>
        {!data.fingerprints.length ? <Table.Row><Table.Cell colSpan={11} py="4">No fingerprint reported yet. It is captured the next time the client opens the app.</Table.Cell></Table.Row> : data.fingerprints.map((fingerprint) => <Table.Row key={fingerprint.visitorId}>
          <Table.Cell fontFamily="mono" title={fingerprint.visitorId}>{fingerprint.visitorId.slice(0, 12)}</Table.Cell>
          <Table.Cell title={fingerprint.userAgent ?? undefined}>{deviceLabel(fingerprint)}</Table.Cell>
          <Table.Cell>{yesOrDash(fingerprint.details.gpuRenderer)}</Table.Cell>
          <Table.Cell>{yesOrDash(fingerprint.details.screen)}</Table.Cell>
          <Table.Cell>{yesOrDash(fingerprint.details.timezone)}</Table.Cell>
          <Table.Cell><Text fontFamily="mono">{fingerprint.ip || "—"}</Text><Text fontSize="xs" color="gray.500">{place(fingerprint.city, fingerprint.region, fingerprint.country)}</Text></Table.Cell>
          <Table.Cell>{fingerprint.seenCount}</Table.Cell>
          <Table.Cell>{time(fingerprint.firstSeen)}</Table.Cell>
          <Table.Cell>{time(fingerprint.lastSeen)}</Table.Cell>
          <Table.Cell>{fingerprint.otherUsers.length ? <Badge colorPalette="red">{fingerprint.otherUsers.length}</Badge> : "—"}</Table.Cell>
          <Table.Cell><details><summary style={{ cursor: "pointer" }}>View</summary>
            <Box fontSize="xs" mt="1" minW="260px">
              {([["Full ID", fingerprint.visitorId], ["Stability score", fingerprint.confidence], ["Device", deviceKind(fingerprint)], ["Platform", fingerprint.details.platform], ["Locale", fingerprint.details.locale], ["Languages", fingerprint.details.languages], ["CPU cores", fingerprint.details.cores], ["Memory (GB)", fingerprint.details.memoryGb], ["Graphics vendor", fingerprint.details.gpuVendor], ["Color depth", fingerprint.details.colorDepth], ["Pixel ratio", fingerprint.details.pixelRatio], ["Touch points", fingerprint.details.touchPoints], ["Fonts found", fingerprint.details.fontCount], ["User agent", fingerprint.userAgent]] as const).map(([label, value]) => <Text key={label}><Text as="span" color="gray.500">{label}: </Text>{yesOrDash(value)}</Text>)}
            </Box>
          </details></Table.Cell>
        </Table.Row>)}
      </Table.Body></Table.Root>
    </Box>}

    {data && (data.ips.length > 0 || data.devices.length > 0) && <Flex gap="6" wrap="wrap" mb="5">
      <Box flex="1" minW="280px" overflowX="auto">
        <Text fontSize="sm" fontWeight="semibold" mb="2">IP addresses (last {data.summaryDays} days)</Text>
        <Table.Root size="sm"><Table.Header><Table.Row>{["IP", "Location", "Events", "First seen", "Last seen", "Other accounts"].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header><Table.Body>
          {data.ips.map((ip) => <Table.Row key={ip.ip}>
            <Table.Cell fontFamily="mono">{ip.ip}</Table.Cell>
            <Table.Cell>{place(ip.city, ip.region, ip.country)}</Table.Cell>
            <Table.Cell>{ip.events}</Table.Cell>
            <Table.Cell>{time(ip.firstSeen)}</Table.Cell>
            <Table.Cell>{time(ip.lastSeen)}</Table.Cell>
            <Table.Cell>{ip.otherUsers.length ? <Badge colorPalette="orange">{ip.otherUsers.length}</Badge> : "—"}</Table.Cell>
          </Table.Row>)}
        </Table.Body></Table.Root>
      </Box>
      <Box flex="1" minW="280px" overflowX="auto">
        <Text fontSize="sm" fontWeight="semibold" mb="2">Devices (last {data.summaryDays} days)</Text>
        <Table.Root size="sm"><Table.Header><Table.Row>{["Browser", "Device", "IPs", "Events", "First seen", "Last seen"].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header><Table.Body>
          {data.devices.map((device, index) => <Table.Row key={index}>
            <Table.Cell>{deviceLabel(device)}</Table.Cell>
            <Table.Cell textTransform="capitalize">{deviceKind(device) ?? "—"}</Table.Cell>
            <Table.Cell>{device.ips}</Table.Cell>
            <Table.Cell>{device.events}</Table.Cell>
            <Table.Cell>{time(device.firstSeen)}</Table.Cell>
            <Table.Cell>{time(device.lastSeen)}</Table.Cell>
          </Table.Row>)}
        </Table.Body></Table.Root>
      </Box>
    </Flex>}

    <Box overflowX="auto"><Table.Root size="sm" minW="900px">
      <Table.Header><Table.Row>{["Date", "Event", "IP", "Location", "Browser", "Device", "Technical"].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
      <Table.Body>
        {loading || error || !data?.events.length ? <Table.Row><Table.Cell colSpan={7} py="6">{loading ? "Loading access history..." : error ? "Use Refresh to retry." : "No access recorded yet. Tracking starts with the next sign-in or visit."}</Table.Cell></Table.Row> : data.events.map((event) => <Table.Row key={event.id}>
          <Table.Cell whiteSpace="nowrap">{time(event.createdAt)}</Table.Cell>
          <Table.Cell>
            <Text color={event.event === "login_failed" ? "red.600" : undefined}>{EVENT_LABELS[event.event] ?? event.event}</Text>
            {event.detail && <Text fontSize="xs" color="gray.500">{DETAIL_LABELS[event.detail] ?? event.detail}</Text>}
          </Table.Cell>
          <Table.Cell>
            <Text fontFamily="mono">{event.ip || "—"}</Text>
            {event.ipSource && <Text fontSize="xs" color="gray.500" title={event.forwardedFor ? `X-Forwarded-For: ${event.forwardedFor}` : undefined}>{SOURCE_LABELS[event.ipSource] ?? event.ipSource}</Text>}
          </Table.Cell>
          <Table.Cell>{place(event.city, event.region, event.country)}</Table.Cell>
          <Table.Cell title={event.userAgent ?? undefined}>{deviceLabel(event)}</Table.Cell>
          <Table.Cell textTransform="capitalize">{deviceKind(event) ?? "—"}</Table.Cell>
          <Table.Cell><details><summary style={{ cursor: "pointer" }}>View</summary>
            <Box fontSize="xs" mt="1" minW="260px">
              <Text><Text as="span" color="gray.500">User agent: </Text>{event.userAgent || "—"}</Text>
              <Text><Text as="span" color="gray.500">X-Forwarded-For: </Text>{event.forwardedFor || "—"}</Text>
            </Box>
          </details></Table.Cell>
        </Table.Row>)}
      </Table.Body>
    </Table.Root></Box>
    <Flex mt="4" justify="space-between" align="center" gap="3" wrap="wrap"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2" align="center"><PagePicker page={page} totalPages={pages} onChange={setPage} disabled={loading || !!error} /><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage(page + 1)}>Next</Button></Flex></Flex>
  </Box>;
}
