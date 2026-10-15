import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  Input,
  Portal,
  Textarea,
} from "@chakra-ui/react";
import { X } from "lucide-react";
import { api } from "../../api";
import type { MaintenanceEntry, MaintenancePayload, MaintenanceService } from "../../types";

const services: MaintenanceService[] = ["client-service", "ats-engine", "crawler", "application-worker"];

function serviceLabel(service: MaintenanceService): string {
  if (service === "client" || service === "client-service") return "Client service";
  if (service === "ats-engine") return "ATS engine";
  if (service === "application-worker") return "Application worker";
  return "Crawler";
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
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (!entry) return "";
    const date = new Date(entry.scheduledAt);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  });
  const [expectedDuration, setExpectedDuration] = useState(entry?.expectedDuration ?? 60);
  const [description, setDescription] = useState(entry?.description ?? "");
  const [selectedServices, setSelectedServices] = useState<MaintenanceService[]>(entry?.services.map((service) => service === "client" ? "client-service" : service) ?? []);
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
    if (!scheduledAt) return setError("Scheduled time is required.");
    if (!Number.isInteger(expectedDuration) || expectedDuration < 1 || expectedDuration > 43200) {
      return setError("Expected duration must be between 1 minute and 30 days.");
    }
    if (!selectedServices.length) return setError("Select at least one service.");
    const payload: MaintenancePayload = {
      label: label.trim(),
      scheduledAt: new Date(scheduledAt).toISOString(),
      expectedDuration,
      description: description.trim() || null,
      services: selectedServices,
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
                <Field.Root required>
                  <Field.Label>Scheduled time</Field.Label>
                  <Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Expected duration (minutes)</Field.Label>
                  <Input type="number" min={1} max={43200} step={1} value={expectedDuration} onChange={(event) => setExpectedDuration(Number(event.target.value))} required />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Description</Field.Label>
                  <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} rows={3} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Services</Field.Label>
                  <Flex gap="5" flexWrap="wrap">
                    {services.map((service) => (
                      <Box
                        as="label"
                        key={service}
                        display="inline-flex"
                        alignItems="center"
                        gap="2"
                        cursor="pointer"
                        userSelect="none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service)}
                          onChange={(event) => toggleService(service, event.target.checked)}
                          style={{ accentColor: "#38a169", width: 16, height: 16, cursor: "pointer" }}
                        />
                        <span>{serviceLabel(service)}</span>
                      </Box>
                    ))}
                  </Flex>
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
