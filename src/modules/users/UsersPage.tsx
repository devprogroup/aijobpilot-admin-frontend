import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  NativeSelect,
  Flex,
  Icon,
  Input,
  InputGroup,
  Table,
  Text,
} from "@chakra-ui/react";
import { KeyRound, Search, Users } from "lucide-react";
import { api } from "../../api";
import { PagePicker } from "../../components/PagePicker";
import type { User } from "../../types";
import { UserStats } from "./components/UserStats";
import { UserDetailsDialog } from "./components/UserDetailsDialog";
import { UserPasswordDialog } from "./components/UserPasswordDialog";
import { UserNameDialog } from "./components/UserNameDialog";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

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
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [nameUser, setNameUser] = useState<User | null>(null);
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

  const shown = useMemo(
    () =>
      users.filter(
        (x) => (!statusFilter || x.status === statusFilter) && (
          (x.name || "").toLowerCase().includes(query.toLowerCase()) ||
          (x.username || "").toLowerCase().includes(query.toLowerCase()) ||
          (x.email || "").toLowerCase().includes(query.toLowerCase()) ||
          String(x.id).includes(query.trim()) ||
          (query.trim() !== "" && (x.profileIds ?? []).some((id) => String(id).includes(query.trim())))),
      ),
    [users, query, statusFilter],
  );

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
  const pages = Math.max(1, Math.ceil(shown.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = shown.slice((currentPage - 1) * 20, currentPage * 20);
  const stats: [string, number][] = [
    ["Total users", users.length],
    ["Active", users.filter((x) => x.status === "active").length],
    [
      "Applications",
      users.reduce((total, user) => total + (user._count?.applications ?? 0), 0),
    ],
  ];

  return (
    <>
      <Box as="header" mb="8">
        <Text
          mb="2"
          fontSize="xs"
          fontWeight="bold"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="#498366"
        >
          People
        </Text>
        <Text
          as="h1"
          m="0"
          fontSize="3xl"
          fontWeight="bold"
          letterSpacing="tight"
        >
          Clients
        </Text>
        <Text mt="2" fontSize="sm" color="gray.500">
          Manage client accounts and review their account activity.
        </Text>
      </Box>

      {error && (
        <Box
          mb="5"
          borderRadius="xl"
          bg="red.50"
          p="4"
          fontSize="sm"
          color="red.700"
        >
          {error}
        </Box>
      )}
      {message && <Box mb="5" role="status" borderRadius="xl" bg="green.50" p="4" fontSize="sm" color="green.700">{message}</Box>}

      <UserStats stats={stats} />
      <Flex gap="3" mb="4">
        <Button variant="outline" disabled={loading || pending !== null} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
        <NativeSelect.Root maxW="48"><NativeSelect.Field aria-label="Filter users by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
        </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
      </Flex>

      <Box
        as="section"
        overflow="hidden"
        borderRadius="2xl"
        border="1px solid"
        borderColor="gray.200"
        bg="white"
        boxShadow="0 12px 35px rgba(24, 43, 34, .07)"
      >
        <Flex
          flexWrap="wrap"
          align="center"
          justify="space-between"
          gap="3"
          borderBottom="1px solid"
          borderColor="gray.100"
          p="5"
        >
          <Flex align="center" gap="2">
            <Icon as={Users} boxSize="19px" />
            <Text fontWeight="bold">All users</Text>
          </Flex>
          <InputGroup
            startElement={<Icon as={Search} boxSize="4" color="gray.400" />}
            maxW="44"
          >
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              aria-label="Search users by name, username, email or ID"
              placeholder="Search users, user ID or profile ID"
              bg="gray.100"
              border="none"
              fontSize="sm"
            />
          </InputGroup>
        </Flex>
        <Box overflowX="auto">
          <Table.Root minW="940px" size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  User
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Email
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Status
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Credit
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Profiles
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Applications
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Joined
                </Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(loading || !visible.length) && <Table.Row><Table.Cell colSpan={8} p="8" textAlign="center">{loading ? "Loading users..." : error ? "Unable to load users. Use Refresh to retry." : users.length ? "No users match your filters." : "No users yet."}</Table.Cell></Table.Row>}
              {!loading && visible.map((u) => (
                <Table.Row key={u.id} _hover={{ bg: "gray.50" }}>
                  <Table.Cell px="5" py="4">
                    <Text fontWeight="semibold">{u.name || u.username || "—"}</Text>
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">ID {u.id}</Text>
                    {u.name && (
                      <Text fontSize="xs" color="gray.400">
                        {u.username}
                      </Text>
                    )}
                    <Link to={`/users/clients/${u.id}`} style={{ color: "#15803d", textDecoration: "underline" }}>View details</Link>
                    {canEditClients && <Button size="xs" variant="plain" disabled={pending !== null} onClick={() => setSelected(u)}>Edit</Button>}
                    {canEditClients && <Button size="xs" variant="plain" disabled={pending !== null} onClick={() => setNameUser(u)}>Edit name</Button>}
                  </Table.Cell>
                  <Table.Cell
                    px="5"
                    py="4"
                    textTransform="capitalize"
                    color="gray.500"
                  >
                    <Text textTransform="none">{u.email || "—"}</Text>
                    {u.email && <Text fontSize="xs">{u.emailVerified ? "Verified" : "Unverified"}</Text>}
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    <NativeSelect.Root size="sm" disabled={!canEditClients || pending !== null}><NativeSelect.Field aria-label={`Status for ${u.username}`} value={u.status} onChange={(event) => void change(u, event.target.value as User["status"])}>
                      <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
                    </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    {u.credit.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    <Text>{u._count?.profiles ?? 0}</Text>
                    {(u.profileIds?.length ?? 0) > 0 && (
                      <Text fontSize="xs" color="gray.500" fontFamily="mono" title="Profile IDs (not deleted)">
                        {u.profileIds!.map((id) => `#${id}`).join(", ")}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    {u._count?.applications ?? 0}
                  </Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell px="5" py="4"><Button size="sm" variant="outline" disabled={!canEditClients || pending !== null} onClick={() => { setError(""); setMessage(""); setPasswordUser(u); }}><KeyRound size={14} />Update password</Button></Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
      <Flex mt="4" justify="space-between" align="center" gap="3" wrap="wrap"><Text fontSize="sm">{shown.length} users · Page {currentPage} of {pages}</Text><Flex gap="2" align="center"><PagePicker page={currentPage} totalPages={pages} onChange={setPage} disabled={loading} /><Button size="sm" variant="outline" disabled={loading || currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</Button></Flex></Flex>
      {selected && <UserDetailsDialog user={selected} onClose={() => setSelected(null)} onSaved={(user) => {
        setUsers((values) => values.map((old) => old.id === user.id ? { ...old, ...user } : old));
        setSelected(null);
      }} />}
      {passwordUser && <UserPasswordDialog user={passwordUser} onClose={() => setPasswordUser(null)} onSaved={() => {
        setPasswordUser(null);
        setMessage(`Password updated for ${passwordUser.username}.`);
      }} />}
      {nameUser && <UserNameDialog user={nameUser} onClose={() => setNameUser(null)} onSaved={(user) => {
        setUsers((values) => values.map((old) => old.id === user.id ? { ...old, ...user } : old));
        setNameUser(null);
      }} />}
    </>
  );
}
