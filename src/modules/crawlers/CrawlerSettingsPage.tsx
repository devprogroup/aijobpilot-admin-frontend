import { useEffect, useState } from "react";
import { Box, Button, Field, Flex, Input, Text } from "@chakra-ui/react";
import { api } from "../../api";
import { toaster } from "../../components/ui/toaster";

const SETTING_KEY = "CRAWLER_RUN_TIMES";
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function shiftTime(time: string, offsetMinutes: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  const shifted = ((hours * 60 + minutes + offsetMinutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(shifted / 60)).padStart(2, "0")}:${String(shifted % 60).padStart(2, "0")}`;
}

export function CrawlerSettingsPage() {
  // Keep the same offset for loading and saving this editing session.
  const [timezone] = useState(() => ({
    name: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offsetMinutes: new Date().getTimezoneOffset(),
  }));
  const [times, setTimes] = useState<string[]>([""]);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setLoadFailed(false);
    api.settings().then(({ settings }) => {
      if (!active) return;
      const setting = settings.find((item) => item.key === SETTING_KEY);
      setExists(Boolean(setting));
      if (!setting) { setTimes([""]); return; }
      try {
        const value: unknown = JSON.parse(setting.value);
        if (!Array.isArray(value) || !value.length || !value.every((time) => typeof time === "string" && TIME_PATTERN.test(time))) {
          throw new Error("Invalid schedule");
        }
        setTimes([...new Set((value as string[]).map((time) => shiftTime(time, -timezone.offsetMinutes)))].sort());
      } catch {
        setTimes([""]);
        setError("The saved schedule is invalid. Enter valid local times to replace it.");
      }
    }).catch((error: unknown) => {
      if (!active) return;
      setLoadFailed(true);
      setError(error instanceof Error ? error.message : "Unable to load crawler settings");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision, timezone]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!times.length || times.some((time) => !TIME_PATTERN.test(time))) {
      setError("Enter a valid local time for every row.");
      return;
    }
    const normalized = [...new Set(times)].sort();
    setSaving(true);
    try {
      const value = JSON.stringify(normalized.map((time) => shiftTime(time, timezone.offsetMinutes)).sort());
      if (exists) await api.updateSetting(SETTING_KEY, value);
      else await api.createSetting({ key: SETTING_KEY, value });
      setExists(true);
      setTimes(normalized);
      toaster.create({
        title: "Crawler run times saved.",
        description: "The worker has been notified to update its schedule.",
        type: "success",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save crawler settings");
    } finally { setSaving(false); }
  };

  return (
    <Box>
      <Text as="h1" fontSize="3xl" fontWeight="bold" mb="2">Crawler settings</Text>
      <Text color="gray.500" mb="8">Choose when the crawler fleet runs each day.</Text>
      <Box as="form" onSubmit={save} maxW="2xl" bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p="6">
        <Text fontWeight="bold" mb="2">Daily run times ({timezone.name})</Text>
        <Text fontSize="sm" color="gray.500" mb="5">Enter times in your local timezone. Times are saved in UTC using your current timezone offset, so local run times may shift when daylight saving time changes. Each scheduled run queues idle crawlers and waits if another pass is active.</Text>
        {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
        {loading ? <Text role="status">Loading schedule...</Text> : loadFailed ? (
          <Button onClick={() => setRevision((value) => value + 1)}>Retry</Button>
        ) : (
          <>
            {times.map((time, index) => (
              <Flex key={index} align="flex-end" gap="3" mb="4">
                <Field.Root required>
                  <Field.Label>Run time {index + 1}</Field.Label>
                  <Input type="time" step={60} required value={time} disabled={saving} onChange={(event) => {
                    setTimes((values) => values.map((value, position) => position === index ? event.target.value : value));
                  }} />
                </Field.Root>
                <Button type="button" variant="outline" disabled={saving || times.length === 1} aria-label={`Remove run time ${index + 1}`} onClick={() => {
                  setTimes((values) => values.filter((_, position) => position !== index));
                }}>Remove</Button>
              </Flex>
            ))}
            <Flex justify="space-between" gap="3" mt="6">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setTimes((values) => [...values, ""])}>Add time</Button>
              <Button type="submit" bg="green.600" color="white" disabled={saving}>{saving ? "Saving..." : "Save schedule"}</Button>
            </Flex>
          </>
        )}
      </Box>
    </Box>
  );
}
