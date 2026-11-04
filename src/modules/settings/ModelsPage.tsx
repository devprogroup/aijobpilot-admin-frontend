import { useEffect, useState } from "react";
import { Box, Button, Flex, NativeSelect, Text } from "@chakra-ui/react";
import { api } from "../../api";
import type { LlmModelsResponse, LlmUseCaseConfig, LlmUseCaseRow } from "../../types";

function Select({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Box flex="1" minW="200px">
      <Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">{label}</Text>
      <NativeSelect.Root size="sm" bg="white">
        <NativeSelect.Field aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Box>
  );
}

function sameConfig(a: LlmUseCaseConfig, b: LlmUseCaseConfig): boolean {
  return a.provider === b.provider && a.model === b.model && a.effort === b.effort && (a.textEffort ?? null) === (b.textEffort ?? null);
}

/** Settings > Models: the provider, model and thinking effort behind each LLM use case. A save
 * reaches the bot and the resume parser within seconds, no restart. */
export function ModelsPage() {
  const [data, setData] = useState<LlmModelsResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LlmUseCaseConfig>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () =>
    api.llmModels().then((result) => {
      setData(result);
      setDrafts(Object.fromEntries(result.useCases.map((useCase) => [useCase.id, useCase.config])));
    });

  useEffect(() => {
    load().catch((reason) => setError(reason.message));
  }, []);

  const providerOf = (id: string) => data?.providers.find((provider) => provider.id === id);
  const modelOf = (provider: string, model: string) => providerOf(provider)?.models.find((option) => option.id === model);

  // A provider change picks its first model; a model change keeps an effort the new model takes
  // and otherwise falls back to the model's default.
  const change = (useCase: LlmUseCaseRow, patch: Partial<LlmUseCaseConfig>) =>
    setDrafts((current) => {
      const draft: LlmUseCaseConfig = { ...current[useCase.id]!, ...patch };
      const provider = providerOf(draft.provider);
      if (!provider) return current;
      if (!provider.models.some((option) => option.id === draft.model)) draft.model = provider.models[0]!.id;
      const model = modelOf(draft.provider, draft.model)!;
      if (!model.efforts.includes(draft.effort)) draft.effort = model.defaultEffort;
      if (useCase.textEffortLabel) {
        const textEffort = draft.textEffort ?? draft.effort;
        draft.textEffort = model.efforts.includes(textEffort) ? textEffort : model.efforts.includes("low") ? "low" : model.defaultEffort;
      } else {
        delete draft.textEffort;
      }
      return { ...current, [useCase.id]: draft };
    });

  const save = async (useCase: LlmUseCaseRow) => {
    const draft = drafts[useCase.id];
    if (!draft) return;
    setError("");
    setMessage("");
    setBusyId(useCase.id);
    try {
      await api.updateLlmModel(useCase.id, draft);
      await load();
      setMessage(`${useCase.label} now uses ${modelOf(draft.provider, draft.model)?.label ?? draft.model}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the model settings.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Box as="header" mb="8">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">
          Settings
        </Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Models</Text>
        <Text mt="2" fontSize="sm" color="gray.500">
          Which AI provider, model and thinking effort each task runs with. A change applies to the next request within seconds; running applications finish with the old setting.
        </Text>
      </Box>

      {(error || message) && (
        <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"}>
          {error || message}
        </Box>
      )}

      {data?.useCases.map((useCase) => {
        const draft = drafts[useCase.id] ?? useCase.config;
        const provider = providerOf(draft.provider);
        const model = modelOf(draft.provider, draft.model);
        const dirty = !sameConfig(draft, useCase.config);
        const effortOptions = (model?.efforts ?? [draft.effort]).map((effort) => (
          <option key={effort} value={effort}>{data.effortLabels[effort] ?? effort}</option>
        ));
        return (
          <Box key={useCase.id} mb="5" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" p="5">
            <Flex justify="space-between" align="start" gap="4" flexWrap="wrap">
              <Box>
                <Text fontWeight="bold">{useCase.label}</Text>
                <Text mt="1" fontSize="sm" color="gray.500">{useCase.description}</Text>
              </Box>
              <Text fontSize="xs" color="gray.400">
                {useCase.updatedAt ? `Saved ${new Date(useCase.updatedAt).toLocaleString()}` : "Not saved yet (built-in default)"}
              </Text>
            </Flex>
            <Flex mt="4" gap="3" align="end" flexWrap="wrap">
              <Select label="Provider" value={draft.provider} onChange={(value) => change(useCase, { provider: value as LlmUseCaseConfig["provider"] })}>
                {data.providers.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}{option.credentialConfigured ? "" : " (no API key)"}</option>
                ))}
              </Select>
              <Select label="Model" value={draft.model} onChange={(value) => change(useCase, { model: value })}>
                {(provider?.models ?? []).map((option) => <option key={option.id} value={option.id}>{option.label} ({option.id})</option>)}
              </Select>
              <Select label={useCase.textEffortLabel ? "Reasoning for choices and facts" : "Reasoning"} value={draft.effort} onChange={(value) => change(useCase, { effort: value })}>
                {effortOptions}
              </Select>
              {useCase.textEffortLabel && (
                <Select label={useCase.textEffortLabel} value={draft.textEffort ?? draft.effort} onChange={(value) => change(useCase, { textEffort: value })}>
                  {effortOptions}
                </Select>
              )}
              <Button
                bg="green.600" color="white" _hover={{ bg: "green.700" }}
                disabled={!dirty || busyId !== null}
                loading={busyId === useCase.id}
                onClick={() => void save(useCase)}
              >
                Save
              </Button>
            </Flex>
            {provider && !provider.credentialConfigured && (
              <Text mt="3" fontSize="sm" color="red.600">
                Add {provider.credentialKey} under Settings &gt; Credentials before saving {provider.label}.
              </Text>
            )}
            {model?.note && <Text mt="3" fontSize="sm" color="gray.500">{model.note}</Text>}
          </Box>
        );
      })}
    </>
  );
}
