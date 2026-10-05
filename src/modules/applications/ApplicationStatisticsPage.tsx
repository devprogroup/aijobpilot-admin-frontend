import { useEffect, useState } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import { api } from "../../api";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { ApplicationStatus } from "../../types";

const APPLIED_HUE = "#24845b";
const FAILED_HUE = "#cf4646";
const STATUS_ORDER: ApplicationStatus[] = ["queued", "applying", "applied", "failed"];

export function ApplicationStatisticsPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.failedApplicationStats>> | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.failedApplicationStats(from, to).then((value) => {
      if (active) setStats(value);
    }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "Unable to load statistics");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, revision]);

  return <>
    <Flex as="header" justify="space-between" align="center" gap="4" mb="8">
      <Box><Text as="h1" fontSize="3xl" fontWeight="bold">Statistics</Text><Text color="gray.500">Application volume by status and application site.</Text></Box>
      <Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    <Flex as="form" gap="3" mb="5" wrap="wrap" onSubmit={(event) => event.preventDefault()}>
      <Input aria-label="From date" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} bg="white" w="44" />
      <Input aria-label="To date" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} bg="white" w="44" />
      <Button variant="outline" disabled={!from && !to} onClick={() => { setFrom(""); setTo(""); }}>Clear</Button>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}

    <Flex gap="5" wrap="wrap" mb="5">
      <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p="6" minW="56">
        <Text fontSize="sm" color="gray.500" mb="2">Total failed applications</Text>
        <Text fontSize="5xl" fontWeight="bold" lineHeight="1" color="#0b0b0b">
          {loading ? "—" : (stats?.total ?? 0).toLocaleString()}
        </Text>
        {(from || to) && <Text fontSize="xs" color="gray.500" mt="2">{from || "…"} to {to || "…"}</Text>}
      </Box>
      {STATUS_ORDER.map((status) => {
        const count = stats?.byStatus.find((row) => row.status === status)?.count ?? 0;
        return (
          <Box key={status} bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p="6" minW="40">
            <Box mb="2"><StatusBadge status={status} /></Box>
            <Text fontSize="5xl" fontWeight="bold" lineHeight="1" color="#0b0b0b">
              {loading ? "—" : count.toLocaleString()}
            </Text>
          </Box>
        );
      })}
    </Flex>

    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p="6" mb="5">
      <Text fontWeight="bold" mb="1">Applied vs failed by site</Text>
      <Text fontSize="xs" color="gray.500" mb="4">Share of completed applications at each site</Text>
      <Flex gap="5" mb="5" fontSize="xs" color="gray.600"><Flex align="center" gap="2"><Box w="3" h="3" borderRadius="sm" bg={APPLIED_HUE} />Applied</Flex><Flex align="center" gap="2"><Box w="3" h="3" borderRadius="sm" bg={FAILED_HUE} />Failed</Flex></Flex>
      {loading ? <Text color="gray.500">Loading...</Text>
        : error ? <Text color="gray.500">Unable to load statistics. Use Refresh to retry.</Text>
        : !stats?.bySite.length ? <Text color="gray.500">No applied or failed applications in this range.</Text>
        : <Flex direction="column" gap="3">
            {stats.bySite.map((row) => (
              <Flex key={row.siteName} align="start" gap="3">
                <Text
                  w="36" flexShrink={0} mt="1" fontSize="sm" color="#52514e"
                  overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap"
                  title={row.siteName}
                >
                  {row.siteName}
                </Text>
                {(() => {
                  const total = row.applied + row.failed;
                  const appliedPercent = total ? Math.round(row.applied / total * 10000) / 100 : 0;
                  const failedPercent = total ? 100 - appliedPercent : 0;
                  const appliedLabel = appliedPercent.toFixed(2);
                  const failedLabel = failedPercent.toFixed(2);
                  return <Box flex="1" minW="0">
                    <Flex h="7" borderRadius="md" overflow="hidden" bg="gray.100" aria-label={`${row.siteName}: ${appliedLabel}% applied, ${failedLabel}% failed`} role="img">
                      {row.applied > 0 && <Flex width={`${appliedPercent}%`} minW={appliedPercent < 2 ? "1px" : undefined} bg={APPLIED_HUE} align="center" justify="center" color="white" fontSize="xs" fontWeight="bold">{appliedPercent >= 15 ? `${appliedLabel}%` : ""}</Flex>}
                      {row.failed > 0 && <Flex width={`${failedPercent}%`} minW={failedPercent < 2 ? "1px" : undefined} bg={FAILED_HUE} align="center" justify="center" color="white" fontSize="xs" fontWeight="bold">{failedPercent >= 15 ? `${failedLabel}%` : ""}</Flex>}
                    </Flex>
                    <Text mt="1" fontSize="xs" color="gray.500">{appliedLabel}% applied · {failedLabel}% failed ({total.toLocaleString()} total)</Text>
                  </Box>;
                })()}
              </Flex>
            ))}
          </Flex>}
    </Box>
  </>;
}
