import { useEffect, useMemo, useState } from "react";
import { Box, Button, chakra, Flex, Icon, Input, InputGroup, Switch, Table, Text } from "@chakra-ui/react";
import { Play, Plus, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Crawler } from "../types";
import { StatusBadge } from "./StatusBadge";
import { CreateCrawlerModal } from "./CreateCrawlerModal";

const ChakraRouterLink = chakra(Link);

const time = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(date))
    : "—";

export function CrawlerPage() {
  const [items, setItems] = useState<Crawler[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [queueingId, setQueueingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setItems((await api.crawlers()).crawlers);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load crawlers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter(
      (crawler) => !term || crawler.name.toLowerCase().includes(term) || crawler.crawlerType.name.toLowerCase().includes(term),
    );
  }, [items, query]);

  const toggle = async (crawler: Crawler) => {
    setItems((current) => current.map((item) => (item.id === crawler.id ? { ...item, active: !item.active } : item)));
    try {
      await api.toggleCrawler(crawler.id, !crawler.active);
    } catch (error) {
      setItems((current) => current.map((item) => (item.id === crawler.id ? crawler : item)));
      setError(error instanceof Error ? error.message : "Unable to update crawler");
    }
  };

  const queue = async (crawler: Crawler) => {
    setQueueingId(crawler.id);
    setError("");
    try {
      const { crawler: updated } = await api.queueCrawler(crawler.id);
      setItems((current) => current.map((item) => (item.id === crawler.id ? { ...item, queuedAt: updated.queuedAt } : item)));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to queue crawler");
    } finally {
      setQueueingId(null);
    }
  };

  return (
    <>
      {showCreate && (
        <CreateCrawlerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      <Flex as="header" mb="8" flexWrap="wrap" align="flex-end" justify="space-between" gap="4">
        <Box>
          <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Operations</Text>
          <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Crawler fleet</Text>
          <Text mt="2" fontSize="sm" color="gray.500">Manage crawler availability and queue runs.</Text>
        </Box>
        <Flex align="center" gap="3">
          <Button onClick={() => setShowCreate(true)} bg="green.600" color="white" _hover={{ bg: "green.700" }}>
            <Icon as={Plus} boxSize="4" />Create crawler
          </Button>
          <Button onClick={load} variant="outline" borderColor="gray.200" bg="white">
            <Icon as={RefreshCw} boxSize="4" className={loading ? "animate-spin" : undefined} />Refresh
          </Button>
        </Flex>
      </Flex>

      {error && <Box mb="5" borderRadius="xl" bg="red.50" p="4" fontSize="sm" color="red.700">{error}</Box>}

      <Box as="section" overflow="hidden" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
        <Flex flexWrap="wrap" align="center" justify="space-between" gap="3" borderBottom="1px solid" borderColor="gray.100" p="5">
          <Box>
            <Text m="0" fontWeight="bold">Crawlers</Text>
            <Text mt="1" fontSize="xs" color="gray.400">{items.length} crawlers registered</Text>
          </Box>
          <InputGroup startElement={<Icon as={Search} boxSize="4" color="gray.400" />} maxW="44">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search crawlers" bg="gray.100" border="none" fontSize="sm" />
          </InputGroup>
        </Flex>
        <Box overflowX="auto">
          <Table.Root minW="900px" size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Crawler name</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Crawler type</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Status</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Latest run</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3">Enabled</Table.ColumnHeader>
                <Table.ColumnHeader fontSize="xs" textTransform="uppercase" color="gray.400" px="5" py="3" textAlign="right">Run</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {!loading && shown.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={6} px="5" py="10" textAlign="center" color="gray.400">No crawlers found.</Table.Cell>
                </Table.Row>
              )}
              {shown.map((crawler) => (
                <Table.Row key={crawler.id} _hover={{ bg: "gray.50" }}>
                  <Table.Cell px="5" py="4">
                    <ChakraRouterLink to={`/crawlers/fleets/${crawler.id}`} fontWeight="semibold" color="green.700" _hover={{ textDecoration: "underline" }}>
                      {crawler.name}
                    </ChakraRouterLink>
                  </Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.600">{crawler.crawlerType.name}</Table.Cell>
                  <Table.Cell px="5" py="4"><StatusBadge status={crawler.status} /></Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.500">{time(crawler.latestRun?.requestedAt ?? null)}</Table.Cell>
                  <Table.Cell px="5" py="4">
                    <Switch.Root checked={crawler.active} onCheckedChange={() => toggle(crawler)} colorPalette="green">
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      <Switch.Label srOnly>Toggle {crawler.name}</Switch.Label>
                    </Switch.Root>
                  </Table.Cell>
                  <Table.Cell px="5" py="4" textAlign="right">
                    <Button
                      size="xs"
                      disabled={ !(crawler.status === "idle" && crawler.active) }
                      onClick={() => queue(crawler)}
                      bg="gray.900"
                      color="white"
                      _hover={{ bg: "gray.700" }}
                    >
                      <Icon as={Play} boxSize="3.5" />
                      {queueingId === crawler.id ? "Queueing…" : crawler.status === "running" ? "Running…" : crawler.queuedAt ? "Queue again" : "Run"}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
    </>
  );
}
