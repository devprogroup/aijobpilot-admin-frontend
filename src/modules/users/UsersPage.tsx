import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Badge,
  Box,
  Button,
  NativeSelect,
  Flex,
  Icon,
  IconButton,
  Input,
  InputGroup,
  Table,
  Text,
} from "@chakra-ui/react";
import { Coins, KeyRound, RefreshCw, Search, Trash2 } from "lucide-react";
import { api } from "../../api";
import { PagePicker } from "../../components/PagePicker";
import type { User } from "../../types";
import { FingerprintHoverCard } from "./components/FingerprintHoverCard";
import { UserStats } from "./components/UserStats";
import { UserDetailsDialog } from "./components/UserDetailsDialog";
import { UserPasswordDialog } from "./components/UserPasswordDialog";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const PAGE_SIZE = 50;
/** Fixed widths so the whole table fits a laptop screen and long values are cut, not pushed aside. */
const COLUMNS: Array<[label: string, width: string]> = [
  ["Client", "196px"], ["Status", "108px"], ["Credit", "70px"], ["Profiles", "92px"], ["Apps", "54px"], ["Seen / Joined", "96px"],
  ["IP / Location", "168px"], ["Browser / Device", "138px"], ["Fingerprint", "138px"], ["Actions", "106px"],
];
const STATUS_COLORS: Record<User["status"], string> = { active: "green.700", inactive: "gray.500", suspended: "red.600" };
const LINK_STYLE = { color: "#15803d", textDecoration: "underline" };

function timeAgo(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 43200) return `${Math.floor(minutes / 1440)}d ago`;
  return new Date(value).toLocaleDateString();
}

const locationOf = ({ city, region, country }: { city: string | null; region: string | null; country: string | null }) =>
  [city, region, country].filter(Boolean).join(", ");

/** Two tight lines; long values are cut and shown in full on hover. */
function Lines({ top, bottom, title }: { top: ReactNode; bottom?: ReactNode; title?: string }) {
  return <Box title={title} minW="0" lineHeight="1.3">
    <Flex align="center" gap="1" overflow="hidden" whiteSpace="nowrap">{top}</Flex>
    {bottom && <Text truncate color="gray.500" fontSize="11px">{bottom}</Text>}
  </Box>;
}

function SharedBadge({ count, palette, title }: { count: number; palette: string; title: string }) {
  if (count < 1) return null;
  return <Badge size="xs" flexShrink={0} colorPalette={palette} title={title}>+{count}</Badge>;
}

export function UsersPage() {
  // Technical admins can view clients; only super admins change them (the API enforces it).
  const { user: currentAdmin } = useAuth();
  const canEditClients = currentAdmin?.role === "super_admin";
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [sharedFilter, setSharedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .users()
      .then((x) => setUsers(x.users))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [revision]);

  const shown = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((x) => {
      if (statusFilter && x.status !== statusFilter) return false;
      if (sharedFilter === "ip" && !x.lastAccess?.otherAccounts) return false;
      if (sharedFilter === "fingerprint" && !x.lastFingerprint?.otherAccounts) return false;
      if (!search) return true;
      return [x.name, x.username, x.email, String(x.id), x.lastAccess?.ip, x.lastAccess?.city, x.lastAccess?.region, x.lastAccess?.country,
        x.lastAccess?.browser, x.lastAccess?.os, x.lastFingerprint?.visitorId, x.lastFingerprint?.details.timezone]
        .some((value) => value?.toLowerCase().includes(search))
        || (x.profileIds ?? []).some((id) => String(id).includes(search));
    });
  }, [users, query, statusFilter, sharedFilter]);

  const deleteUser = async (u: User) => {
    const name = u.username || u.email || `#${u.id}`;
    const typed = window.prompt(
      `Permanently delete ${name} and everything of theirs: all profiles, applications, job matches, private jobs, uploads, messages, credit history and files. This cannot be undone.\n\nType ${name} to confirm.`,
    );
    if (typed === null) return;
    if (typed.trim() !== name) { setError("The name you typed didn't match; nothing was deleted."); return; }
    setPending(u.id); setError(""); setMessage("");
    try {
      const { deleted } = await api.deleteUser(u.id);
      setUsers((values) => values.filter((old) => old.id !== u.id));
      setMessage(`Deleted ${name}: ${deleted.profiles} profile(s), ${deleted.applications} application(s), ${deleted.privateJobs} private job(s), ${deleted.files} file location(s).`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete user.");
    } finally { setPending(null); }
  };

  const change = async (u: User, status: User["status"]) => {
    setPending(u.id);
    setError("");
    try {
      const { user } = await api.setUserStatus(u.id, status);
      setUsers((values) => values.map((old) => old.id === u.id ? { ...old, ...user } : old));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update user status");
    } finally { setPending(null); }
  };
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const stats: [string, number][] = [
    ["Clients", users.length],
    ["Active", users.filter((x) => x.status === "active").length],
    ["Profiles", users.reduce((total, user) => total + (user.profileIds?.length ?? 0), 0)],
    ["Active profiles", users.reduce((total, user) => total + (user.activeProfileIds?.length ?? 0), 0)],
    ["Applications", users.reduce((total, user) => total + (user._count?.applications ?? 0), 0)],
    ["Shared devices", users.filter((user) => user.lastFingerprint?.otherAccounts).length],
  ];

  return (
    <>
      <Flex as="header" mb="4" align="center" justify="space-between" gap="4" wrap="wrap">
        <Text as="h1" m="0" fontSize="2xl" fontWeight="bold" letterSpacing="tight">Clients</Text>
        <UserStats stats={stats} />
      </Flex>

      {error && <Box mb="3" borderRadius="lg" bg="red.50" px="3" py="2" fontSize="sm" color="red.700">{error}</Box>}
      {message && <Box mb="3" role="status" borderRadius="lg" bg="green.50" px="3" py="2" fontSize="sm" color="green.700">{message}</Box>}

      <Box as="section" overflow="hidden" borderRadius="xl" border="1px solid" borderColor="gray.200" bg="white" p="4">
        <Flex wrap="wrap" align="center" gap="2" mb="3">
          <InputGroup flex="1" minW="240px" maxW="420px" startElement={<Icon as={Search} boxSize="3.5" color="gray.400" />}>
            <Input
              size="xs"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              aria-label="Search clients by name, email, ID, profile ID, IP, location, browser or fingerprint"
              placeholder="Search name, email, ID, IP, location, fingerprint"
              bg="gray.100"
              border="none"
              fontSize="xs"
            />
          </InputGroup>
          <NativeSelect.Root size="xs" maxW="130px"><NativeSelect.Field aria-label="Filter clients by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
            <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
          </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
          <NativeSelect.Root size="xs" maxW="150px"><NativeSelect.Field aria-label="Filter clients sharing an IP or device" value={sharedFilter} onChange={(event) => { setSharedFilter(event.target.value); setPage(1); }}>
            <option value="">All clients</option><option value="ip">Shared IP</option><option value="fingerprint">Shared fingerprint</option>
          </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
          <IconButton aria-label="Refresh clients" title="Refresh" size="xs" variant="outline" disabled={loading || pending !== null} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={13} /></IconButton>
        </Flex>
        <Box overflowX="auto" border="1px solid" borderColor="gray.100" borderRadius="lg">
          <Table.Root minW="1166px" size="sm" fontSize="xs" tableLayout="fixed">
            <Table.Header bg="gray.50">
              <Table.Row>
                {COLUMNS.map(([label, width]) => <Table.ColumnHeader key={label} w={width} fontSize="10px" letterSpacing="wide" textTransform="uppercase" color="gray.500" px="3" py="1.5" ps={label === COLUMNS[0][0] ? "4" : undefined} pe={label === COLUMNS[COLUMNS.length - 1][0] ? "4" : undefined} whiteSpace="nowrap" textAlign={label === "Credit" || label === "Apps" ? "right" : undefined}>{label}</Table.ColumnHeader>)}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(loading || !visible.length) && <Table.Row><Table.Cell colSpan={COLUMNS.length} p="6" textAlign="center">{loading ? "Loading clients..." : error ? "Unable to load clients. Use Refresh to retry." : users.length ? "No clients match your filters." : "No clients yet."}</Table.Cell></Table.Row>}
              {!loading && visible.map((u) => {
                const access = u.lastAccess;
                const fingerprint = u.lastFingerprint;
                const profileIds = u.profileIds ?? [];
                return <Table.Row key={u.id} _hover={{ bg: "gray.50" }}>
                  <Table.Cell px="3" ps="4" py="1">
                    <Lines
                      title={[u.username, u.email, u.emailVerified ? "Email verified" : "Email not verified", `Joined ${new Date(u.createdAt).toLocaleDateString()}`].filter(Boolean).join("\n")}
                      top={<><Link to={`/users/clients/${u.id}`} style={{ ...LINK_STYLE, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{u.name || u.username || "—"}</Link><Text as="span" flexShrink={0} color="gray.400" fontFamily="mono" fontSize="11px">#{u.id}</Text></>}
                      bottom={<>{u.email || "No email"}{u.email && !u.emailVerified && <Text as="span" color="orange.600"> · unverified</Text>}</>}
                    />
                  </Table.Cell>
                  <Table.Cell px="3" py="1">
                    <NativeSelect.Root size="xs" disabled={!canEditClients || pending !== null}><NativeSelect.Field h="6" pl="1.5" pr="5" fontSize="11px" aria-label={`Status for ${u.username}`} value={u.status} color={STATUS_COLORS[u.status]} onChange={(event) => void change(u, event.target.value as User["status"])}>
                      <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
                    </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                  </Table.Cell>
                  <Table.Cell px="3" py="1" textAlign="right" fontVariantNumeric="tabular-nums" title={String(u.credit)}>
                    {u.credit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Table.Cell>
                  <Table.Cell px="3" py="1">
                    <Lines
                      top={<>{u.activeProfileIds?.length ?? 0}/{profileIds.length}<Text as="span" color="gray.500">active</Text></>}
                      bottom={profileIds.length > 0 && <>
                        {profileIds.slice(0, 2).map((id, index) => <span key={id}>{index > 0 && " "}<Link to={`/users/clients/${u.id}/profiles/${id}`} aria-label={`View profile #${id}`} style={LINK_STYLE}>#{id}</Link></span>)}
                        {profileIds.length > 2 && <> <Link to={`/users/clients/${u.id}`} style={LINK_STYLE}>+{profileIds.length - 2}</Link></>}
                      </>}
                    />
                  </Table.Cell>
                  <Table.Cell px="3" py="1" textAlign="right" fontVariantNumeric="tabular-nums">{u._count?.applications ?? 0}</Table.Cell>
                  <Table.Cell px="3" py="1" whiteSpace="nowrap">
                    <Lines
                      title={access ? new Date(access.at).toLocaleString() : undefined}
                      top={access ? timeAgo(access.at) : <Text as="span" color="gray.400">Not yet</Text>}
                      bottom={new Date(u.createdAt).toLocaleDateString()}
                    />
                  </Table.Cell>
                  <Table.Cell px="3" py="1">
                    {access ? <Lines
                      title={[access.ip, locationOf(access), `${access.ipCount} IP(s) in 90 days`, access.otherAccounts ? `${access.otherAccounts} other account(s) on this IP` : ""].filter(Boolean).join("\n")}
                      top={<><Text as="span" truncate fontFamily="mono">{access.ip || "—"}</Text><SharedBadge count={access.otherAccounts} palette="orange" title={`${access.otherAccounts} other account(s) used this IP in the last 90 days`} /></>}
                      bottom={`${access.ipCount > 1 ? `${access.ipCount} IPs · ` : ""}${locationOf(access) || "Location unknown"}`}
                    /> : <Text color="gray.400">—</Text>}
                  </Table.Cell>
                  <Table.Cell px="3" py="1">
                    {access ? <Lines
                      top={<Text as="span" truncate>{access.browser || "Unknown browser"}</Text>}
                      bottom={<Text as="span" textTransform="capitalize">{[access.os || "Unknown OS", access.device || access.deviceType].filter(Boolean).join(" · ")}</Text>}
                    /> : <Text color="gray.400">—</Text>}
                  </Table.Cell>
                  <Table.Cell px="3" py="1">
                    {fingerprint ? <FingerprintHoverCard fingerprint={fingerprint}><Lines
                      top={<><Text as="span" truncate fontFamily="mono">{fingerprint.visitorId.slice(0, 10)}</Text>{fingerprint.count > 1 && <Text as="span" flexShrink={0} color="gray.500" fontSize="11px">×{fingerprint.count}</Text>}<SharedBadge count={fingerprint.otherAccounts} palette="red" title={`${fingerprint.otherAccounts} other account(s) reported this fingerprint`} /></>}
                      bottom={fingerprint.details.timezone || "Timezone unknown"}
                    /></FingerprintHoverCard> : <Text color="gray.400">Not captured</Text>}
                  </Table.Cell>
                  <Table.Cell px="3" pe="4" py="1">
                    <Flex gap="0.5">
                      <IconButton aria-label={`Edit credit of ${u.email}`} title="Edit credit" size="2xs" variant="ghost" disabled={!canEditClients || pending !== null} onClick={() => setSelected(u)}><Coins size={13} /></IconButton>
                      <IconButton aria-label={`Update password for ${u.email}`} title="Update password" size="2xs" variant="ghost" disabled={!canEditClients || pending !== null} onClick={() => { setError(""); setMessage(""); setPasswordUser(u); }}><KeyRound size={13} /></IconButton>
                      <IconButton aria-label={`Delete ${u.email}`} title="Delete" size="2xs" variant="ghost" colorPalette="red" disabled={!canEditClients || pending !== null} loading={pending === u.id} onClick={() => void deleteUser(u)}><Trash2 size={13} /></IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>;
              })}
            </Table.Body>
          </Table.Root>
        </Box>
        <Flex justify="flex-end" align="center" gap="3" wrap="wrap" mt="1.5">
          <Flex gap="1.5" align="center"><PagePicker page={currentPage} totalPages={pages} onChange={setPage} disabled={loading} /><Button size="xs" fontSize="xs" variant="outline" disabled={loading || currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button size="xs" fontSize="xs" variant="outline" disabled={loading || currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</Button></Flex>
        </Flex>
      </Box>
      {selected && <UserDetailsDialog user={selected} onClose={() => setSelected(null)} onSaved={(user) => {
        setUsers((values) => values.map((old) => old.id === user.id ? { ...old, ...user } : old));
        setSelected(null);
      }} />}
      {passwordUser && <UserPasswordDialog user={passwordUser} onClose={() => setPasswordUser(null)} onSaved={() => {
        setPasswordUser(null);
        setMessage(`Password updated for ${passwordUser.username}.`);
      }} />}
    </>
  );
}
