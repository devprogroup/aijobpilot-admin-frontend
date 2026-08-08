import { useEffect, useMemo, useState } from "react";
import { Box, Flex, Icon, IconButton, Input, InputGroup, SimpleGrid, Table, Text } from "@chakra-ui/react";
import { Search, Users } from "lucide-react";
import { api } from "../api";
import type { User } from "../types";
import { StatusBadge } from "./StatusBadge";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.users().then((x) => setUsers(x.users)).catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(
    () => users.filter((x) => x.username.toLowerCase().includes(query.toLowerCase()) || x.role.toLowerCase().includes(query.toLowerCase())),
    [users, query],
  );

  const change = async (u: User, status: string) => {
    const old = u.status;
    setUsers((v) => v.map((x) => (x.id === u.id ? { ...x, status } : x)));
    try { await api.setUserStatus(u.id, status); }
    catch { setUsers((v) => v.map((x) => (x.id === u.id ? { ...x, status: old } : x))); }
  };

  const stats: [string, number][] = [
    ["Total users", users.length],
    ["Active", users.filter((x) => x.status === "active").length],
    ["Applications", users.reduce((n, x) => n + x._count.applications, 0)],
  ];

  return (
    <>
      <Box as="header" mb="8">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">People</Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Users</Text>
        <Text mt="2" fontSize="sm" color="gray.500">Manage access and review account activity.</Text>
      </Box>

      {error && <Box mb="5" borderRadius="xl" bg="red.50" p="4" fontSize="sm" color="red.700">{error}</Box>}

      <SimpleGrid columns={{ base: 1, sm: 3 }} gap="4" mb="6">
        {stats.map(([label, value]) => (
          <Box key={label} borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" p="5" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
            <Text fontSize="xs" fontWeight="semibold" letterSpacing="wider" textTransform="uppercase" color="gray.400">{label}</Text>
            <Text mt="2" fontSize="3xl" fontWeight="bold">{value}</Text>
          </Box>
        ))}
      </SimpleGrid>

      <Box as="section" overflow="hidden" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
        <Flex flexWrap="wrap" align="center" justify="space-between" gap="3" borderBottom="1px solid" borderColor="gray.100" p="5">
          <Flex align="center" gap="2">
            <Icon as={Users} boxSize="19px" />
            <Text fontWeight="bold">All users</Text>
          </Flex>
          <InputGroup startElement={<Icon as={Search} boxSize="4" color="gray.400" />} maxW="44">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" bg="gray.100" border="none" fontSize="sm" />
          </InputGroup>
        </Flex>
        <Box overflowX="auto">
          <Table.Root minW="720px" size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">User</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Role</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Status</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Profiles</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Applications</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Joined</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {shown.map((u) => (
                <Table.Row key={u.id} _hover={{ bg: "gray.50" }}>
                  <Table.Cell px="5" py="4">
                    <Text fontWeight="semibold">{u.username}</Text>
                    <Text maxW="48" truncate fontSize="xs" color="gray.400">{u.id}</Text>
                  </Table.Cell>
                  <Table.Cell px="5" py="4" textTransform="capitalize" color="gray.500">{u.role}</Table.Cell>
                  <Table.Cell px="5" py="4">
                    <IconButton
                      aria-label="Toggle status"
                      title="Click to toggle status"
                      onClick={() => change(u, u.status === "active" ? "suspended" : "active")}
                      variant="plain"
                      p="0"
                      h="auto"
                      minW="0"
                    >
                      <StatusBadge status={u.status} />
                    </IconButton>
                  </Table.Cell>
                  <Table.Cell px="5" py="4">{u._count.profiles}</Table.Cell>
                  <Table.Cell px="5" py="4">{u._count.applications}</Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.500">{new Date(u.createdAt).toLocaleDateString()}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
    </>
  );
}
