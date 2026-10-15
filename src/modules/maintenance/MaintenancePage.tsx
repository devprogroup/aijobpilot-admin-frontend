import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Table,
  Text,
} from "@chakra-ui/react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../api";
import type { MaintenanceEntry } from "../../types";
import { MaintenanceFormModal } from "./MaintenanceFormModal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { onSocketEvent } from "../../services/websocket";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function serviceLabel(service: MaintenanceEntry["services"][number]): string {
  if (service === "client" || service === "client-service") return "Client service";
  if (service === "ats-engine") return "ATS engine";
  if (service === "application-worker") return "Application worker";
  return "Crawler";
}

export function MaintenancePage() {
  const [entries, setEntries] = useState<MaintenanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | MaintenanceEntry | null>(null);
  const [transitioning, setTransitioning] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries((await api.maintenance()).maintenance);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load maintenance schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => onSocketEvent("maintenance:updated", () => { void load(); }), [load]);

  const transition = async (entry: MaintenanceEntry, action: "start" | "finish") => {
    setTransitioning(entry.id);
    setError("");
    try {
      if (action === "start") await api.startMaintenance(entry.id);
      else await api.finishMaintenance(entry.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable to ${action} maintenance.`);
    } finally {
      setTransitioning(null);
    }
  };

  const remove = async (entry: MaintenanceEntry) => {
    if (!window.confirm(`Delete maintenance entry "${entry.label}"? This cannot be undone.`)) return;
    try {
      await api.deleteMaintenance(entry.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete maintenance entry.");
    }
  };

  return (
    <>
      {modal && <MaintenanceFormModal entry={modal === "create" ? undefined : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); void load(); }} />}
      <Box as="header" mb="8">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Operations</Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Maintenance</Text>
        <Text mt="2" fontSize="sm" color="gray.500">Schedule and track maintenance across platform services.</Text>
      </Box>
      {error && <Box mb="5" borderRadius="xl" bg="red.50" p="4" fontSize="sm" color="red.700">{error}</Box>}
      <Box as="section" overflow="hidden" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
        <Flex flexWrap="wrap" align="center" justify="space-between" gap="3" borderBottom="1px solid" borderColor="gray.100" p="5">
          <Box>
            <Text m="0" fontWeight="bold">Maintenance schedule</Text>
            <Text mt="1" fontSize="xs" color="gray.400">{entries.length} entries</Text>
          </Box>
          <Button onClick={() => setModal("create")} bg="green.600" color="white" _hover={{ bg: "green.700" }}>
            <Icon as={Plus} boxSize="4" /> Schedule maintenance
          </Button>
        </Flex>
        <Box overflowX="auto">
          <Table.Root minW="1260px" size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                {[
                  ["Label", "left"], ["Scheduled at", "left"], ["Expected duration", "left"], ["Started at", "left"], ["Finished at", "left"],
                  ["Description", "left"], ["Services", "left"], ["Status", "left"], ["Actions", "right"],
                ].map(([label, align]) => (
                  <Table.ColumnHeader key={label} px="4" py="3" textAlign={align as "left" | "right"} fontSize="xs" textTransform="uppercase" color="gray.400">{label}</Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {!loading && entries.length === 0 && (
                <Table.Row><Table.Cell colSpan={9} px="5" py="10" textAlign="center" color="gray.400">No maintenance scheduled.</Table.Cell></Table.Row>
              )}
              {entries.map((entry) => (
                <Table.Row key={entry.id} _hover={{ bg: "gray.50" }}>
                  <Table.Cell px="4" py="4" fontWeight="semibold">{entry.label}</Table.Cell>
                  <Table.Cell px="4" py="4" whiteSpace="nowrap">{formatDate(entry.scheduledAt)}</Table.Cell>
                  <Table.Cell px="4" py="4" whiteSpace="nowrap">{entry.expectedDuration} min</Table.Cell>
                  <Table.Cell px="4" py="4" whiteSpace="nowrap">{formatDate(entry.startedAt)}</Table.Cell>
                  <Table.Cell px="4" py="4" whiteSpace="nowrap">{formatDate(entry.finishedAt)}</Table.Cell>
                  <Table.Cell px="4" py="4" maxW="xs" color="gray.600"><Text lineClamp={2}>{entry.description || "—"}</Text></Table.Cell>
                  <Table.Cell px="4" py="4">
                    <Flex gap="1.5" flexWrap="wrap">{entry.services.map((service) => <Box key={service} borderRadius="md" bg="gray.100" px="2" py="1" fontSize="xs" color="gray.700">{serviceLabel(service)}</Box>)}</Flex>
                  </Table.Cell>
                  <Table.Cell px="4" py="4" whiteSpace="nowrap">
                    <StatusBadge status={entry.status} />
                    {entry.status === "cooling" && <Text mt="1" fontSize="xs" color="gray.500">Ready {(entry.readyServices ?? []).length}/{entry.services.length}</Text>}
                  </Table.Cell>
                  <Table.Cell px="4" py="4">
                    <Flex justify="flex-end" gap="1">
                      {entry.status === "ready" && <Button size="xs" bg="green.600" color="white" _hover={{ bg: "green.700" }} disabled={transitioning !== null} onClick={() => void transition(entry, "start")}>{transitioning === entry.id ? "Starting…" : "Start"}</Button>}
                      {entry.status === "started" && <Button size="xs" bg="blue.600" color="white" _hover={{ bg: "blue.700" }} disabled={transitioning !== null} onClick={() => void transition(entry, "finish")}>{transitioning === entry.id ? "Finishing…" : "Finish"}</Button>}
                      <IconButton aria-label={`Delete ${entry.label}`} size="sm" variant="ghost" colorPalette="red" onClick={() => void remove(entry)}><Trash2 size={16} /></IconButton>
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
