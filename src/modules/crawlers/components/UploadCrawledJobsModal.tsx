import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  Icon,
  IconButton,
  NativeSelect,
  Portal,
  Textarea,
} from "@chakra-ui/react";
import { FileJson, Upload, X } from "lucide-react";
import { api } from "../../../api";
import type { Crawler } from "../../../types";
import { toaster } from "../../../components/ui/toaster";

export function UploadCrawledJobsModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [crawlerId, setCrawlerId] = useState("");
  const [mode, setMode] = useState<"text" | "file">("text");
  const [jobsJson, setJobsJson] = useState("");
  const [file, setFile] = useState<{ name: string; text: string; count: number | null } | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .crawlers()
      .then((r) => setCrawlers(r.crawlers))
      .catch(() => setError("Unable to load crawlers"));
  }, []);

  const onFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    setError("");
    try {
      const text = await chosen.text();
      let count: number | null = null;
      try {
        const parsed: unknown = JSON.parse(text);
        if (Array.isArray(parsed)) count = parsed.length;
      } catch {
        // Reported on submit.
      }
      setFile({ name: chosen.name, text, count });
    } catch {
      setError("Unable to read the selected file");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!crawlerId) {
      setError("Select a crawler");
      return;
    }

    if (mode === "file" && !file) {
      setError("Choose a JSON file");
      return;
    }

    let jobs: unknown;
    try {
      jobs = JSON.parse(mode === "file" ? file!.text : jobsJson);
    } catch {
      setError(mode === "file" ? "The file isn't valid JSON" : "Jobs must be valid JSON");
      return;
    }
    if (!Array.isArray(jobs) || jobs.length === 0) {
      setError("Jobs must be a non-empty JSON array");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.uploadCrawledJobs(Number(crawlerId), jobs);
      toaster.create({
        title: `Uploaded ${result.count} crawled job${result.count === 1 ? "" : "s"}.`,
        description: "ats-engine has been notified to process them.",
        type: "success",
      });
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload crawled jobs");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="xl" borderRadius="2xl" p="6">
            <Flex mb="5" align="center" justify="space-between">
              <Dialog.Title fontSize="lg" fontWeight="bold">
                Upload crawled jobs
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

            <Box as="form" onSubmit={submit}>
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

                <Field.Root required>
                  <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
                    Crawler
                  </Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={crawlerId}
                      onChange={(event) => setCrawlerId(event.target.value)}
                      borderColor="gray.200"
                      fontSize="sm"
                    >
                      <option value="" disabled>
                        Select a crawler
                      </option>
                      {crawlers.map((crawler) => (
                        <option key={crawler.id} value={crawler.id}>
                          {crawler.name} ({crawler.crawlerType?.name ?? "unknown type"})
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root required>
                  <Flex w="full" align="center" justify="space-between" gap="3">
                    <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">
                      Jobs (JSON array)
                    </Field.Label>
                    <Flex border="1px solid" borderColor="gray.200" borderRadius="lg" p="0.5" gap="0.5">
                      {(["text", "file"] as const).map((option) => (
                        <Button
                          key={option}
                          type="button"
                          size="xs"
                          variant="ghost"
                          borderRadius="md"
                          px="3"
                          bg={mode === option ? "gray.100" : "transparent"}
                          color={mode === option ? "gray.800" : "gray.500"}
                          aria-pressed={mode === option}
                          onClick={() => {
                            setMode(option);
                            setError("");
                          }}
                        >
                          {option === "text" ? "Text" : "File"}
                        </Button>
                      ))}
                    </Flex>
                  </Flex>
                  {mode === "text" ? (
                    <Textarea
                      rows={12}
                      value={jobsJson}
                      onChange={(event) => setJobsJson(event.target.value)}
                      placeholder={
                        '[\n' +
                        '  {\n' +
                        '    "url": "https://example.com/jobs/123",\n' +
                        '    "source": "example",\n' +
                        '    "positionName": "Frontend Engineer",\n' +
                        '    "company": { "name": "Acme", "url": "", "logoUrl": "" }\n' +
                        '  }\n' +
                        ']'
                      }
                      borderColor="gray.200"
                      fontFamily="mono"
                      fontSize="xs"
                    />
                  ) : (
                    <Button
                      type="button"
                      w="full"
                      variant="outline"
                      h="auto"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      gap="2"
                      minH="44"
                      border="2px dashed"
                      borderColor="gray.200"
                      borderRadius="xl"
                      color="gray.500"
                      fontSize="sm"
                      cursor="pointer"
                      _hover={{ borderColor: "gray.300", bg: "gray.50" }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Icon as={file ? FileJson : Upload} boxSize="6" />
                      {file ? (
                        <>
                          <Box fontWeight="semibold" color="gray.700">{file.name}</Box>
                          <Box fontSize="xs">
                            {file.count === null
                              ? "Not a JSON array"
                              : `${file.count} job${file.count === 1 ? "" : "s"}`}{" "}
                            · click to choose another file
                          </Box>
                        </>
                      ) : (
                        <Box>Choose a .json file (a JSON array of jobs)</Box>
                      )}
                    </Button>
                  )}
                </Field.Root>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={onFileChosen}
                  style={{ display: "none" }}
                />

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
                    disabled={submitting}
                    bg="green.600"
                    color="white"
                    _hover={{ bg: "green.700" }}
                  >
                    {submitting ? "Uploading…" : "Upload jobs"}
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
