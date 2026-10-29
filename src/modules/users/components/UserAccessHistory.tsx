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

/** The client's sign-ins and activity with IP, location and device, plus the IPs it used (flagging
 * ones other accounts used too) and its devices. */
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

  return <Box bg="white" borderRadius="2xl" p="5" mt="6">
    <Flex justify="space-between" align="center" mb="4">
      <Box>
        <Text fontWeight="bold">Access history{data ? ` (${data.total})` : ""}</Text>
        <Text fontSize="xs" color="gray.500">Sign-ins, failed sign-ins, password changes and activity (at most every 30 minutes per IP and browser)</Text>
      </Box>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="3">{error}</Text>}

    {data && sharedIps.length > 0 && <Box border="1px solid" borderColor="orange.200" bg="orange.50" borderRadius="lg" p="3" mb="4">
      <Text fontWeight="semibold" color="orange.800" fontSize="sm">
        {sharedIps.length === 1 ? "1 IP address" : `${sharedIps.length} IP addresses`} of this client {sharedIps.length === 1 ? "was" : "were"} also used by other accounts in the last {data.summaryDays} days
      </Text>
      {sharedIps.map((ip) => <Text key={ip.ip} fontSize="sm" color="orange.900" mt="1">
        <Text as="span" fontFamily="mono">{ip.ip}</Text>{": "}
        {ip.otherUsers.map((other, index) => <span key={other.id}>{index > 0 && ", "}<Link to={`/users/clients/${other.id}`} style={{ textDecoration: "underline" }}>{other.name || other.email || `#${other.id}`}</Link></span>)}
      </Text>)}
    </Box>}

    {data && (data.ips.length > 0 || data.devices.length > 0) && <Flex gap="6" wrap="wrap" mb="5">
      <Box flex="1" minW="280px" overflowX="auto">
        <Text fontSize="sm" fontWeight="semibold" mb="2">IP addresses (last {data.summaryDays} days)</Text>
        <Table.Root size="sm"><Table.Header><Table.Row>{["IP", "Location", "Events", "Last seen", "Other accounts"].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header><Table.Body>
          {data.ips.map((ip) => <Table.Row key={ip.ip}>
            <Table.Cell fontFamily="mono">{ip.ip}</Table.Cell>
            <Table.Cell>{place(ip.city, null, ip.country)}</Table.Cell>
            <Table.Cell>{ip.events}</Table.Cell>
            <Table.Cell>{time(ip.lastSeen)}</Table.Cell>
            <Table.Cell>{ip.otherUsers.length ? <Badge colorPalette="orange">{ip.otherUsers.length}</Badge> : "—"}</Table.Cell>
          </Table.Row>)}
        </Table.Body></Table.Root>
      </Box>
      <Box flex="1" minW="280px" overflowX="auto">
        <Text fontSize="sm" fontWeight="semibold" mb="2">Devices (last {data.summaryDays} days)</Text>
        <Table.Root size="sm"><Table.Header><Table.Row>{["Browser", "Device", "IPs", "Events", "Last seen"].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header><Table.Body>
          {data.devices.map((device, index) => <Table.Row key={index}>
            <Table.Cell>{deviceLabel(device)}</Table.Cell>
            <Table.Cell textTransform="capitalize">{deviceKind(device) ?? "—"}</Table.Cell>
            <Table.Cell>{device.ips}</Table.Cell>
            <Table.Cell>{device.events}</Table.Cell>
            <Table.Cell>{time(device.lastSeen)}</Table.Cell>
          </Table.Row>)}
        </Table.Body></Table.Root>
      </Box>
    </Flex>}

    <Box overflowX="auto"><Table.Root size="sm" minW="900px">
      <Table.Header><Table.Row>{["Date", "Event", "IP", "Location", "Browser", "Device"].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
      <Table.Body>
        {loading || error || !data?.events.length ? <Table.Row><Table.Cell colSpan={6} py="6">{loading ? "Loading access history..." : error ? "Use Refresh to retry." : "No access recorded yet. Tracking starts with the next sign-in or visit."}</Table.Cell></Table.Row> : data.events.map((event) => <Table.Row key={event.id}>
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
        </Table.Row>)}
      </Table.Body>
    </Table.Root></Box>
    <Flex mt="4" justify="space-between" align="center" gap="3" wrap="wrap"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2" align="center"><PagePicker page={page} totalPages={pages} onChange={setPage} disabled={loading || !!error} /><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage(page + 1)}>Next</Button></Flex></Flex>
  </Box>;
}
