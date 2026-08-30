import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Table,
  Text,
} from "@chakra-ui/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../../api";
import type { CrawlerType } from "../../../types";
import { CrawlerTypeFormModal } from "./CrawlerTypeFormModal";

export function CrawlerTypesTable() {
  const [types, setTypes] = useState<CrawlerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | CrawlerType | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setTypes((await api.crawlerTypes()).crawlerTypes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load crawler types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (t: CrawlerType) => {
    if (
      !window.confirm(`Delete crawler type "${t.name}"? This cannot be undone.`)
    )
      return;
    try {
      await api.deleteCrawlerType(t.id);
      load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to delete crawler type",
      );
    }
  };

  return (
    <>
      {modal && (
        <CrawlerTypeFormModal
          crawlerType={modal === "create" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}

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
          <Box>
            <Text m="0" fontWeight="bold">
              Crawler types
            </Text>
            <Text mt="1" fontSize="xs" color="gray.400">
              {types.length} types configured
            </Text>
          </Box>
          <Button
            onClick={() => setModal("create")}
            bg="green.600"
            color="white"
            _hover={{ bg: "green.700" }}
          >
            <Icon as={Plus} boxSize="4" />
            Add type
          </Button>
        </Flex>
        <Box overflowX="auto">
          <Table.Root minW="720px" size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Name
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  URL
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Mode
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Config
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                >
                  Crawlers
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontSize="xs"
                  textTransform="uppercase"
                  color="gray.400"
                  px="5"
                  py="3"
                  textAlign="right"
                >
                  Actions
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {!loading && types.length === 0 && (
                <Table.Row>
                  <Table.Cell
                    colSpan={6}
                    px="5"
                    py="8"
                    textAlign="center"
                    color="gray.400"
                  >
                    No crawler types configured yet.
                  </Table.Cell>
                </Table.Row>
              )}
              {types.map((t) => (
                <Table.Row key={t.id} _hover={{ bg: "gray.50" }}>
                  <Table.Cell px="5" py="4" fontWeight="semibold">
                    {t.name}
                  </Table.Cell>
                  <Table.Cell maxW="xs" truncate px="5" py="4" color="gray.500">
                    {t.url}
                  </Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.500">
                    {t.mode}
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    <Box
                      as="pre"
                      maxW="xs"
                      overflowX="auto"
                      whiteSpace="pre-wrap"
                      wordBreak="break-all"
                      fontSize="xs"
                      color="gray.500"
                    >
                      {JSON.stringify(t.config)}
                    </Box>
                  </Table.Cell>
                  <Table.Cell
                    px="5"
                    py="4"
                    fontWeight="medium"
                    color="gray.600"
                  >
                    {t._count.crawlers}
                  </Table.Cell>
                  <Table.Cell px="5" py="4" textAlign="right">
                    <Flex justify="flex-end" gap="2">
                      <IconButton
                        aria-label={`Edit ${t.name}`}
                        onClick={() => setModal(t)}
                        size="sm"
                        variant="ghost"
                        color="gray.400"
                        _hover={{ bg: "gray.100", color: "gray.600" }}
                      >
                        <Icon as={Pencil} boxSize="4" />
                      </IconButton>
                      <IconButton
                        aria-label={`Delete ${t.name}`}
                        onClick={() => remove(t)}
                        size="sm"
                        variant="ghost"
                        color="gray.400"
                        _hover={{ bg: "red.50", color: "red.600" }}
                      >
                        <Icon as={Trash2} boxSize="4" />
                      </IconButton>
                    </Flex>
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
