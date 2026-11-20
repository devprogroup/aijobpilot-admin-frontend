import { useEffect, useState } from "react";
import { Box, Button, Flex, IconButton, NativeSelect, Table, Text } from "@chakra-ui/react";
import { Pencil, Plus } from "lucide-react";
import { api } from "../../api";
import type { ApplicationSite, ApplicationSitePayload } from "../../types";
import { ApplicationSiteFormModal } from "./components/ApplicationSiteFormModal";

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Sites with a sleep period (cooldown) aren't picked again before wake_up_at.
function WakeUpCell({ site, now }: { site: ApplicationSite; now: number }) {
  const wakeUpAt = site.wakeUpAt ? new Date(site.wakeUpAt).getTime() : null;
  const cooldown = site.sleepPeriod ? <Text fontSize="xs" color="gray.500">Cooldown {formatDuration(site.sleepPeriod * 1000)}</Text> : null;
  if (wakeUpAt && wakeUpAt > now) {
    return <Box>
      <Text fontWeight="semibold" color="orange.600">Sleeping</Text>
      <Text fontSize="xs" title={new Date(wakeUpAt).toLocaleString()}>until {new Date(wakeUpAt).toLocaleTimeString()} · in {formatDuration(wakeUpAt - now)}</Text>
      {cooldown}
    </Box>;
  }
  if (!wakeUpAt && !site.sleepPeriod) return <Text color="gray.400">—</Text>;
  return <Box>
    <Text fontWeight="semibold" color="green.700">Awake</Text>
    {wakeUpAt && <Text fontSize="xs" color="gray.500" title={new Date(wakeUpAt).toLocaleString()}>since {new Date(wakeUpAt).toLocaleString()}</Text>}
    {cooldown}
  </Box>;
}

export function ApplicationSitesPage() {
  const [sites, setSites] = useState<ApplicationSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState<"create" | ApplicationSite | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  // Ticks once a second so the wake-up countdowns stay current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const updateSite = async (site: ApplicationSite, payload: Partial<ApplicationSitePayload>) => {
    setPending(site.id);
    setError("");
    try {
      const { applicationSite } = await api.updateApplicationSite(site.id, payload);
      setSites((current) => current.map((item) => item.id === applicationSite.id ? applicationSite : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update application site");
    } finally {
      setPending(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.applicationSites().then((result) => {
      if (!cancelled) setSites(result.applicationSites);
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load application sites");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  return (
    <>
      <Box as="header" mb="8">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Configuration</Text>
        <Text as="h1" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Application sites</Text>
        <Text mt="2" fontSize="sm" color="gray.500">Manage supported application sites and their automation settings.</Text>
      </Box>
      {modal && <ApplicationSiteFormModal site={modal === "create" ? undefined : modal} onClose={() => setModal(null)} onSaved={(saved) => {
        setSites((current) => [...current.filter((site) => site.id !== saved.id), saved].sort((a, b) => a.displayText.localeCompare(b.displayText)));
        setModal(null);
      }} />}
      {error && <Flex role="alert" mb="5" p="4" bg="red.50" color="red.700" borderRadius="xl" align="center" gap="3"><Text>{error}</Text><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Retry</Button></Flex>}
      <Box as="section" overflow="hidden" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
        <Flex p="5" justify="space-between" align="center" gap="3" flexWrap="wrap" borderBottom="1px solid" borderColor="gray.100">
          <Box><Text fontWeight="bold">Application sites</Text><Text fontSize="xs" color="gray.500">{sites.length} sites configured</Text></Box>
          <Button disabled={loading || !!error} onClick={() => setModal("create")} bg="green.600" color="white" _hover={{ bg: "green.700" }}><Plus size={16} />Add site</Button>
        </Flex>
        <Box overflowX="auto">
          <Table.Root minW="900px" size="sm">
            <Table.Header bg="gray.50"><Table.Row>{["Display text", "Type name", "Domain pattern", "Status", "Mode", "New context", "IP per run", "Input gap", "Submit delay", "Page timeout", "Wake up", "Actions"].map((label) => <Table.ColumnHeader key={label} px="4" py="3">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
            <Table.Body>
              {loading && <Table.Row><Table.Cell colSpan={12} p="8" textAlign="center">Loading application sites...</Table.Cell></Table.Row>}
              {!loading && !error && sites.length === 0 && <Table.Row><Table.Cell colSpan={12} p="8" textAlign="center" color="gray.500">No application sites configured yet. Add a site to get started.</Table.Cell></Table.Row>}
              {!loading && sites.map((site) => <Table.Row key={site.id} _hover={{ bg: "gray.50" }}>
                <Table.Cell px="4" py="4" fontWeight="semibold">{site.displayText}</Table.Cell>
                <Table.Cell px="4">{site.typeName}</Table.Cell>
                <Table.Cell px="4" maxW="xs" wordBreak="break-all" fontFamily="mono" fontSize="xs">{site.domainRegex}</Table.Cell>
                <Table.Cell px="4">
                  <NativeSelect.Root size="sm" disabled={pending === site.id}>
                    <NativeSelect.Field
                      aria-label={`Status for ${site.displayText}`}
                      value={site.active ? "active" : "inactive"}
                      onChange={(event) => void updateSite(site, { active: event.target.value === "active" })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Table.Cell>
                <Table.Cell px="4">
                  <NativeSelect.Root size="sm" disabled={pending === site.id}>
                    <NativeSelect.Field
                      aria-label={`Mode for ${site.displayText}`}
                      value={site.mode}
                      onChange={(event) => void updateSite(site, { mode: event.target.value as ApplicationSite["mode"] })}
                    >
                      <option value="headless">Headless</option>
                      <option value="headed">Headed</option>
                      <option value="chrome-extension">Chrome extension</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Table.Cell>
                <Table.Cell px="4">
                  <NativeSelect.Root size="sm" disabled={pending === site.id}>
                    <NativeSelect.Field
                      aria-label={`New context required for ${site.displayText}`}
                      value={site.newContextRequired ? "yes" : "no"}
                      onChange={(event) => void updateSite(site, { newContextRequired: event.target.value === "yes" })}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Table.Cell>
                <Table.Cell px="4">
                  <NativeSelect.Root size="sm" disabled={pending === site.id}>
                    <NativeSelect.Field
                      aria-label={`Different IP for each run of ${site.displayText}`}
                      title="Each application runs on a different VPN server (only on servers with VPN containers)"
                      value={site.rotateIp ? "yes" : "no"}
                      onChange={(event) => void updateSite(site, { rotateIp: event.target.value === "yes" })}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Table.Cell>
                <Table.Cell px="4" whiteSpace="nowrap">{site.fieldInputGapMs} ms</Table.Cell>
                <Table.Cell px="4" whiteSpace="nowrap">{site.submitDelayMs} ms</Table.Cell>
                <Table.Cell px="4" whiteSpace="nowrap">{site.pageTimeout} ms</Table.Cell>
                <Table.Cell px="4" whiteSpace="nowrap"><WakeUpCell site={site} now={now} /></Table.Cell>
                <Table.Cell px="4"><IconButton aria-label={`Edit ${site.displayText}`} variant="ghost" size="sm" onClick={() => setModal(site)}><Pencil size={16} /></IconButton></Table.Cell>
              </Table.Row>)}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
    </>
  );
}
