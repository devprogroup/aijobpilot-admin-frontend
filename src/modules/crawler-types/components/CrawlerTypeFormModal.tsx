import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  IconButton,
  Input,
  Portal,
  Textarea,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { X } from "lucide-react";
import { api } from "../../../api";
import type { CrawlerType } from "../../../types";

interface FormValues {
  name: string;
  config: string;
  parameters: string;
}

const schema = yup.object({
  name: yup.string().required("Name is required"),
  config: yup
    .string()
    .required("Config is required")
    .test("is-json-object", "Config must be a valid JSON object", (value) => {
      if (!value) return false;
      try {
        const parsed = JSON.parse(value);
        return (
          parsed !== null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        );
      } catch {
        return false;
      }
    }),
  parameters: yup
    .string()
    .required("Parameters is required")
    .test(
      "is-parameter-map",
      'Parameters must be a JSON object mapping each parameter name to { "controlType": "input" | "textarea" | "single-select" | "multi-select" | "tenants-csv", "options"?: [{ "key": ..., "value": ... }], "defaultValue"?: ..., "showWhen"?: { "<parameter>": "<value>" }, "format"?: "greenhouse" | "workday" | "ashby" | "jobvite" | "jobdiva" | "rippling" }, with options required for single-select/multi-select',
      (value) => {
        if (!value) return false;
        try {
          const parsed = JSON.parse(value);
          if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            return false;
          }
          const controlTypes = ["input", "textarea", "single-select", "multi-select", "tenants-csv"];
          return Object.values(parsed).every((definition) => {
            if (
              definition === null ||
              typeof definition !== "object" ||
              !controlTypes.includes((definition as { controlType?: unknown }).controlType as string)
            ) {
              return false;
            }
            const { controlType, options } = definition as {
              controlType: string;
              options?: unknown;
            };
            if (options !== undefined) {
              if (!Array.isArray(options)) return false;
              const validOptions = options.every(
                (option) =>
                  option !== null &&
                  typeof option === "object" &&
                  typeof (option as { key?: unknown }).key === "string" &&
                  typeof (option as { value?: unknown }).value === "string",
              );
              if (!validOptions) return false;
            }
            if (["single-select", "multi-select"].includes(controlType)) {
              return Array.isArray(options) && options.length > 0;
            }
            return true;
          });
        } catch {
          return false;
        }
      },
    ),
});

export function CrawlerTypeFormModal({
  crawlerType,
  onClose,
  onSaved,
}: {
  crawlerType?: CrawlerType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: crawlerType?.name ?? "",
      config: crawlerType
        ? JSON.stringify(crawlerType.config, null, 2)
        : "{\n  \n}",
      parameters: crawlerType
        ? JSON.stringify(crawlerType.parameters, null, 2)
        : "{\n  \n}",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setError("");
    const payload = {
      name: data.name,
      config: JSON.parse(data.config),
      parameters: JSON.parse(data.parameters),
    };
    try {
      if (crawlerType) {
        await api.updateCrawlerType(crawlerType.id, payload);
      } else {
        await api.createCrawlerType(payload);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save crawler type");
    }
  };

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="md" borderRadius="2xl" p="6">
            <Flex mb="5" align="center" justify="space-between">
              <Dialog.Title fontSize="lg" fontWeight="bold">
                {crawlerType ? "Edit crawler type" : "Add crawler type"}
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

            <Box as="form" onSubmit={handleSubmit(onSubmit)}>
              <Flex direction="column" gap="4">
                <Field.Root invalid={!!errors.name}>
                  <Field.Label
                    fontSize="xs"
                    fontWeight="semibold"
                    color="gray.500"
                  >
                    Name
                  </Field.Label>
                  <Input
                    {...register("name")}
                    borderColor="gray.200"
                    fontSize="sm"
                  />
                  <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
                </Field.Root>

                <Field.Root invalid={!!errors.config}>
                  <Field.Label
                    fontSize="xs"
                    fontWeight="semibold"
                    color="gray.500"
                  >
                    Config (JSON)
                  </Field.Label>
                  <Textarea
                    {...register("config")}
                    rows={6}
                    borderColor="gray.200"
                    fontFamily="mono"
                    fontSize="xs"
                  />
                  <Field.ErrorText>{errors.config?.message}</Field.ErrorText>
                </Field.Root>

                <Field.Root invalid={!!errors.parameters}>
                  <Field.Label
                    fontSize="xs"
                    fontWeight="semibold"
                    color="gray.500"
                  >
                    Parameters (JSON: name → control definition)
                  </Field.Label>
                  <Textarea
                    {...register("parameters")}
                    rows={6}
                    placeholder={
                      '{\n' +
                      '  "email": { "controlType": "input" },\n' +
                      '  "payload": { "controlType": "textarea" },\n' +
                      '  "mode": { "controlType": "single-select", "options": [\n' +
                      '    { "key": "Headless", "value": "headless" },\n' +
                      '    { "key": "Headed", "value": "headed" }\n' +
                      '  ] }\n' +
                      '}'
                    }
                    borderColor="gray.200"
                    fontFamily="mono"
                    fontSize="xs"
                  />
                  <Field.ErrorText>{errors.parameters?.message}</Field.ErrorText>
                </Field.Root>

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
                    disabled={isSubmitting}
                    bg="green.600"
                    color="white"
                    _hover={{ bg: "green.700" }}
                  >
                    {isSubmitting ? "Saving..." : "Save"}
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
