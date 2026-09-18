import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  IconButton,
  Input,
  NativeSelect,
  Portal,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { X } from "lucide-react";
import { api } from "../../../api";
import type { CrawlerType, CrawlerTypeParameter } from "../../../types";

type ParameterValue = string | string[];

function labelFor(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function defaultValueFor(definition: CrawlerTypeParameter): ParameterValue {
  return definition.controlType === "multi-select" ? [] : "";
}

function ParameterField({
  name,
  definition,
  value,
  onChange,
}: {
  name: string;
  definition: CrawlerTypeParameter;
  value: ParameterValue;
  onChange: (value: ParameterValue) => void;
}) {
  const label = labelFor(name);
  const options = definition.options ?? [];

  if (definition.controlType === "single-select") {
    return (
      <Field.Root>
        <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
          {label}
        </Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            borderColor="gray.200"
            fontSize="sm"
          >
            <option value="" disabled>
              Select an option
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.key}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>
    );
  }

  if (definition.controlType === "multi-select") {
    const selectedValues = Array.isArray(value) ? value : [];
    return (
      <Field.Root>
        <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
          {label} (select multiple)
        </Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            multiple
            value={selectedValues}
            onChange={(event) =>
              onChange(
                Array.from(event.target.selectedOptions, (option) => option.value),
              )
            }
            borderColor="gray.200"
            fontSize="sm"
            height="auto"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.key}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Field.Root>
    );
  }

  if (definition.controlType === "textarea") {
    return (
      <Field.Root>
        <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
          {label}
        </Field.Label>
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          borderColor="gray.200"
          fontFamily="mono"
          fontSize="xs"
        />
      </Field.Root>
    );
  }

  return (
    <Field.Root>
      <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
        {label}
      </Field.Label>
      <Input
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        borderColor="gray.200"
        fontSize="sm"
      />
    </Field.Root>
  );
}

export function CreateCrawlerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [types, setTypes] = useState<CrawlerType[]>([]);
  const [selected, setSelected] = useState<CrawlerType | null>(null);
  const [crawlerName, setCrawlerName] = useState("");
  const [stopSignalData, setStopSignalData] = useState("");
  const [values, setValues] = useState<Record<string, ParameterValue>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .crawlerTypes()
      .then((r) => setTypes(r.crawlerTypes))
      .catch(() => setError("Unable to load crawler types"));
  }, []);

  useEffect(() => {
    if (!selected) {
      setValues({});
      return;
    }
    const initial: Record<string, ParameterValue> = {};
    for (const [name, definition] of Object.entries(selected.parameters)) {
      initial[name] = defaultValueFor(definition);
    }
    setValues(initial);
  }, [selected]);

  const parameterEntries = selected ? Object.entries(selected.parameters) : [];

  function buildConfig(): Record<string, unknown> | null {
    const config: Record<string, unknown> = {};

    for (const [name, definition] of parameterEntries) {
      const raw = values[name];

      if (definition.controlType === "multi-select") {
        const list = Array.isArray(raw) ? raw : [];
        if (list.length === 0) {
          setError(`${labelFor(name)} is required`);
          return null;
        }
        config[name] = list;
        continue;
      }

      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) {
        setError(`${labelFor(name)} is required`);
        return null;
      }

      config[name] = text;
    }

    return config;
  }

  async function onSubmit() {
    setError("");
    if (!selected || !crawlerName.trim()) return;

    const config = buildConfig();
    if (config === null) return;

    setSubmitting(true);
    try {
      await api.createCrawler({
        name: crawlerName.trim(),
        crawlerTypeId: selected.id,
        stopSignalData: stopSignalData.trim() || undefined,
        config,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create crawler");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = Boolean(selected && crawlerName.trim());

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="md" borderRadius="2xl" p="6">
            <Flex mb="5" align="center" justify="space-between">
              <Dialog.Title fontSize="lg" fontWeight="bold">
                Create crawler
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton
                  aria-label="Close"
                  size="sm"
                  variant="ghost"
                  color="gray.400"
                  _hover={{ bg: "gray.100", color: "gray.600" }}
                >
                  <X size={18} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Flex>

            <Box
              as="form"
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
            >
              <Flex direction="column" gap="4">
                {error && (
                  <Box
                    borderRadius="xl"
                    bg="red.50"
                    p="3"
                    fontSize="sm"
                    color="red.700"
                  >
                    {error}
                  </Box>
                )}

                <Field.Root>
                  <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
                    Unique crawler name
                  </Field.Label>
                  <Input
                    value={crawlerName}
                    onChange={(event) => setCrawlerName(event.target.value)}
                    borderColor="gray.200"
                    fontSize="sm"
                    placeholder="e.g. JobRight primary"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
                    Crawler type
                  </Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={selected ? String(selected.id) : ""}
                      onChange={(event) =>
                        setSelected(
                          types.find((t) => String(t.id) === event.target.value) ??
                            null,
                        )
                      }
                      borderColor="gray.200"
                      fontSize="sm"
                    >
                      <option value="" disabled>
                        Select a type
                      </option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

                {selected ? (
                  parameterEntries.length > 0 ? (
                    parameterEntries.map(([name, definition]) => (
                      <ParameterField
                        key={name}
                        name={name}
                        definition={definition}
                        value={values[name] ?? defaultValueFor(definition)}
                        onChange={(value) =>
                          setValues((prev) => ({ ...prev, [name]: value }))
                        }
                      />
                    ))
                  ) : (
                    <Text fontSize="sm" color="gray.400">
                      This crawler type has no configurable parameters.
                    </Text>
                  )
                ) : (
                  <Text fontSize="sm" color="gray.400">
                    Select a crawler type to configure it.
                  </Text>
                )}

                <Field.Root>
                  <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
                    Stop signal data (optional)
                  </Field.Label>
                  <Input
                    value={stopSignalData}
                    onChange={(event) => setStopSignalData(event.target.value)}
                    borderColor="gray.200"
                    fontSize="sm"
                    placeholder="e.g. minScore"
                  />
                </Field.Root>

                <Flex justify="flex-end" gap="3" pt="2">
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="outline"
                    borderColor="gray.200"
                    bg="white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    bg="green.600"
                    color="white"
                    _hover={{ bg: "green.700" }}
                  >
                    {submitting ? "Creating..." : "Create"}
                  </Button>
                </Flex>
              </Flex>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
