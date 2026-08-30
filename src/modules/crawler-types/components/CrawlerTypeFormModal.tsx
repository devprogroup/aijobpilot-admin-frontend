import { useState } from "react";
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
  Textarea,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { X } from "lucide-react";
import { api } from "../../../api";
import type { CrawlerMode, CrawlerType } from "../../../types";

interface FormValues {
  name: string;
  url: string;
  mode: CrawlerMode;
  config: string;
}

const schema = yup.object({
  name: yup.string().required("Name is required"),
  url: yup.string().url("Invalid URL").required("URL is required"),
  mode: yup
    .mixed<CrawlerMode>()
    .oneOf(["headless", "headed", "chrome-ext"])
    .required("Mode is required"),
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
      url: crawlerType?.url ?? "",
      mode: crawlerType?.mode ?? "headless",
      config: crawlerType
        ? JSON.stringify(crawlerType.config, null, 2)
        : "{\n  \n}",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setError("");
    const payload = {
      name: data.name,
      url: data.url,
      mode: data.mode,
      config: JSON.parse(data.config),
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

                <Field.Root invalid={!!errors.url}>
                  <Field.Label
                    fontSize="xs"
                    fontWeight="semibold"
                    color="gray.500"
                  >
                    URL
                  </Field.Label>
                  <Input
                    {...register("url")}
                    borderColor="gray.200"
                    fontSize="sm"
                  />
                  <Field.ErrorText>{errors.url?.message}</Field.ErrorText>
                </Field.Root>

                <Field.Root invalid={!!errors.mode}>
                  <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
                    Mode
                  </Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field {...register("mode")} borderColor="gray.200" fontSize="sm">
                      <option value="headless">Headless</option>
                      <option value="headed">Headed</option>
                      <option value="chrome-ext">Chrome extension</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  <Field.ErrorText>{errors.mode?.message}</Field.ErrorText>
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
