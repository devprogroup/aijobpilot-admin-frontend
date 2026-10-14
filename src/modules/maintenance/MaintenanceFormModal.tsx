import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  Field,
  Flex,
  Input,
  NativeSelect,
  Portal,
  Textarea,
} from "@chakra-ui/react";
import { X } from "lucide-react";
import { api } from "../../api";
import type { MaintenanceEntry, MaintenancePayload, MaintenanceService, MaintenanceStatus } from "../../types";

const services: MaintenanceService[] = ["client", "ats-engine", "crawler"];
const statuses: MaintenanceStatus[] = ["scheduled", "cooling", "in-progress", "finished"];

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function MaintenanceFormModal({
  entry,
  onClose,
  onSaved,
}: {
  entry?: MaintenanceEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(entry?.label ?? "");
  const [scheduledTime, setScheduledTime] = useState(toLocalInput(entry?.scheduledTime));
  const [startTime, setStartTime] = useState(toLocalInput(entry?.startTime));
  const [endTime, setEndTime] = useState(toLocalInput(entry?.endTime));
  const [description, setDescription] = useState(entry?.description ?? "");
  const [selectedServices, setSelectedServices] = useState<MaintenanceService[]>(entry?.services ?? []);
  const [status, setStatus] = useState<MaintenanceStatus>(entry?.status ?? "scheduled");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleService = (service: MaintenanceService, checked: boolean) => {
    setSelectedServices((current) => checked
      ? [...current, service]
      : current.filter((value) => value !== service));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!label.trim()) return setError("Label is required.");
    if (!scheduledTime) return setError("Scheduled time is required.");
    if (!selectedServices.length) return setError("Select at least one service.");
    if (startTime && endTime && new Date(endTime) < new Date(startTime)) {
      return setError("End time must be after start time.");
    }

    const payload: MaintenancePayload = {
      label: label.trim(),
      scheduledTime: new Date(scheduledTime).toISOString(),
      startTime: toIso(startTime),
      endTime: toIso(endTime),
      description: description.trim() || null,
      services: selectedServices,
      status,
    };
    setSaving(true);
    try {
      if (entry) await api.updateMaintenance(entry.id, payload);
      else await api.createMaintenance(payload);
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save maintenance entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="2xl" maxH="calc(100vh - 2rem)" overflowY="auto" borderRadius="2xl" p="6">
            <Flex mb="5" align="center" justify="space-between">
              <Dialog.Title fontSize="lg" fontWeight="bold">{entry ? "Edit maintenance" : "Schedule maintenance"}</Dialog.Title>
              <Dialog.CloseTrigger asChild><Button aria-label="Close" size="sm" variant="ghost"><X size={18} /></Button></Dialog.CloseTrigger>
            </Flex>
            <Box as="form" onSubmit={save}>
              <Flex direction="column" gap="4">
                <Field.Root required>
                  <Field.Label>Label</Field.Label>
                  <Input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={255} required />
                </Field.Root>
                <Box display="grid" gridTemplateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap="3">
                  <Field.Root required>
                    <Field.Label>Scheduled time</Field.Label>
                    <Input type="datetime-local" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} required />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Start time</Field.Label>
                    <Input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>End time</Field.Label>
                    <Input type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                  </Field.Root>
                </Box>
                <Field.Root>
                  <Field.Label>Description</Field.Label>
                  <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} rows={3} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Services</Field.Label>
                  <Flex gap="5" flexWrap="wrap">
                    {services.map((service) => (
                      <Checkbox.Root key={service} checked={selectedServices.includes(service)} onCheckedChange={(details) => toggleService(service, details.checked === true)}>
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>{service}</Checkbox.Label>
                      </Checkbox.Root>
                    ))}
                  </Flex>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Status</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={status} onChange={(event) => setStatus(event.target.value as MaintenanceStatus)}>
                      {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
                {error && <Box borderRadius="xl" bg="red.50" p="3" fontSize="sm" color="red.700">{error}</Box>}
                <Flex justify="flex-end" gap="3" pt="2">
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  <Button type="submit" disabled={saving} bg="green.600" color="white" _hover={{ bg: "green.700" }}>{saving ? "Saving..." : "Save maintenance"}</Button>
                </Flex>
              </Flex>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
