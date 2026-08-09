import { useEffect, useState, type ReactNode } from "react";
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
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { X } from "lucide-react";
import { api } from "../../../api";
import type { CrawlerType } from "../../../types";

interface FormProps {
  crawlerName: string;
  crawlerTypeId: number;
  onCancel: () => void;
  onCreated: () => void;
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <Field.Root invalid={!!error}>
      <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
        {label}
      </Field.Label>
      {children}
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  );
}

interface JobrightFormValues {
  email: string;
  password: string;
}
const jobrightSchema = yup.object({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().required("Password is required"),
});

function JobrightForm({
  crawlerName,
  crawlerTypeId,
  onCancel,
  onCreated,
}: FormProps) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JobrightFormValues>({ resolver: yupResolver(jobrightSchema) });
  const onSubmit = async (data: JobrightFormValues) => {
    setError("");
    try {
      await api.createCrawler({
        name: crawlerName,
        crawlerTypeId,
        config: { email: data.email, password: data.password },
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create crawler");
    }
  };
  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <Flex direction="column" gap="4">
        <FormField label="Email" error={errors.email?.message}>
          <Input {...register("email")} borderColor="gray.200" fontSize="sm" />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <Input
            {...register("password")}
            borderColor="gray.200"
            fontSize="sm"
          />
        </FormField>
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
        <Actions onCancel={onCancel} isSubmitting={isSubmitting} />
      </Flex>
    </Box>
  );
}

interface TsentaFormValues {
  email: string;
  password: string;
  matchScoreMin: number;
}
const tsentaSchema = yup.object({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().required("Password is required"),
  matchScoreMin: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Min is 0")
    .max(100, "Max is 100")
    .required("Match score is required"),
});

function TsentaForm({
  crawlerName,
  crawlerTypeId,
  onCancel,
  onCreated,
}: FormProps) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TsentaFormValues>({ resolver: yupResolver(tsentaSchema) });
  const onSubmit = async (data: TsentaFormValues) => {
    setError("");
    try {
      await api.createCrawler({
        name: crawlerName,
        crawlerTypeId,
        config: {
          email: data.email,
          password: data.password,
          matchScoreMin: data.matchScoreMin,
        },
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create crawler");
    }
  };
  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <Flex direction="column" gap="4">
        <FormField label="Email" error={errors.email?.message}>
          <Input {...register("email")} borderColor="gray.200" fontSize="sm" />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <Input
            {...register("password")}
            borderColor="gray.200"
            fontSize="sm"
          />
        </FormField>
        <FormField
          label="Match score min"
          error={errors.matchScoreMin?.message}
        >
          <Input
            {...register("matchScoreMin")}
            type="number"
            min={0}
            max={100}
            borderColor="gray.200"
            fontSize="sm"
          />
        </FormField>
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
        <Actions onCancel={onCancel} isSubmitting={isSubmitting} />
      </Flex>
    </Box>
  );
}

interface HiringCafeFormValues {
  email: string;
  password: string;
  searchQuery: string;
}
const hiringCafeSchema = yup.object({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().required("Password is required"),
  searchQuery: yup.string().required("Search query is required"),
});

function HiringCafeForm({
  crawlerName,
  crawlerTypeId,
  onCancel,
  onCreated,
}: FormProps) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HiringCafeFormValues>({
    resolver: yupResolver(hiringCafeSchema),
  });
  const onSubmit = async (data: HiringCafeFormValues) => {
    setError("");
    try {
      await api.createCrawler({
        name: crawlerName,
        crawlerTypeId,
        config: {
          email: data.email,
          password: data.password,
          searchQuery: data.searchQuery,
        },
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create crawler");
    }
  };
  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <Flex direction="column" gap="4">
        <FormField label="Search query" error={errors.searchQuery?.message}>
          <Input
            {...register("searchQuery")}
            borderColor="gray.200"
            fontSize="sm"
          />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <Input {...register("email")} borderColor="gray.200" fontSize="sm" />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <Input
            {...register("password")}
            borderColor="gray.200"
            fontSize="sm"
          />
        </FormField>
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
        <Actions onCancel={onCancel} isSubmitting={isSubmitting} />
      </Flex>
    </Box>
  );
}

interface SimplifyFormValues {
  email: string;
  password: string;
  url: string;
}
const simplifySchema = yup.object({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().required("Password is required"),
  url: yup.string().url("Invalid URL").required("URL is required"),
});

function SimplifyForm({
  crawlerName,
  crawlerTypeId,
  onCancel,
  onCreated,
}: FormProps) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SimplifyFormValues>({ resolver: yupResolver(simplifySchema) });
  const onSubmit = async (data: SimplifyFormValues) => {
    setError("");
    try {
      await api.createCrawler({
        name: crawlerName,
        crawlerTypeId,
        config: { email: data.email, password: data.password, url: data.url },
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create crawler");
    }
  };
  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <Flex direction="column" gap="4">
        <FormField label="URL" error={errors.url?.message}>
          <Input {...register("url")} borderColor="gray.200" fontSize="sm" />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <Input {...register("email")} borderColor="gray.200" fontSize="sm" />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <Input
            {...register("password")}
            borderColor="gray.200"
            fontSize="sm"
          />
        </FormField>
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
        <Actions onCancel={onCancel} isSubmitting={isSubmitting} />
      </Flex>
    </Box>
  );
}

function Actions({
  onCancel,
  isSubmitting,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Flex justify="flex-end" gap="3" pt="2">
      <Button
        type="button"
        onClick={onCancel}
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
        {isSubmitting ? "Creating..." : "Create"}
      </Button>
    </Flex>
  );
}

const FORM_BY_TYPE: Record<string, React.ComponentType<FormProps>> = {
  jobright: JobrightForm,
  tsenta: TsentaForm,
  hiringcafe: HiringCafeForm,
  simplify: SimplifyForm,
};

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
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .crawlerTypes()
      .then((r) => setTypes(r.crawlerTypes))
      .catch(() => setError("Unable to load crawler types"));
  }, []);

  const FormComponent = selected ? FORM_BY_TYPE[selected.name] : null;

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

            {error && (
              <Box
                mb="4"
                borderRadius="xl"
                bg="red.50"
                p="3"
                fontSize="sm"
                color="red.700"
              >
                {error}
              </Box>
            )}

            <Field.Root mb="4">
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

            <Field.Root mb="4">
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

            {FormComponent && selected && crawlerName.trim() ? (
              <FormComponent
                crawlerName={crawlerName.trim()}
                crawlerTypeId={selected.id}
                onCancel={onClose}
                onCreated={onCreated}
              />
            ) : (
              <Text fontSize="sm" color="gray.400">
                Enter a unique name and select a crawler type to continue.
              </Text>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
