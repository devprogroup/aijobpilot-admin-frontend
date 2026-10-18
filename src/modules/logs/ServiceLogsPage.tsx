import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Box, Button, Flex, Icon, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { RefreshCw, ScrollText } from "lucide-react";
import { api } from "../../api";
import { StructuredLogViewer } from "../../components/StructuredLogViewer";
import { useAuth } from "../../auth/AuthContext";

type LogService = { id: string; name: string; dates: string[] };

export function ServiceLogsPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<LogService[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingLog, setLoadingLog] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    api.serviceLogs().then(({ services: available }) => {
      if (!active) return;
      setServices(available);
      const firstService = available.find((service) => service.dates.length > 0);
      if (firstService) {
        setServiceId(firstService.id);
        setDate(firstService.dates[0]);
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load available service logs.");
    }).finally(() => { if (active) setLoadingServices(false); });
    return () => { active = false; };
  }, []);

  const selectedService = services.find((service) => service.id === serviceId);
  useEffect(() => {
    if (!serviceId || !date) return;
    let active = true;
    setLoadingLog(true);
    setError("");
    api.serviceLog(serviceId, date).then((result) => {
      if (!active) return;
      setContent(result.content);
      setTruncated(result.truncated);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load service log.");
    }).finally(() => { if (active) setLoadingLog(false); });
    return () => { active = false; };
  }, [serviceId, date, revision]);

  if (user?.role === "support") return <Navigate to="/dashboard" replace />;

  return (
    <>
      <Box mb="6">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Operations</Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Service logs</Text>
        <Text mt="2" maxW="760px" fontSize="sm" color="gray.500">Inspect structured logs written by the application services.</Text>
      </Box>

      <Box border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p={{ base: "4", md: "5" }}>
        <Flex align="center" justify="space-between" gap="4" mb="4" wrap="wrap">
          <Flex align="center" gap="3">
            <Flex h="10" w="10" align="center" justify="center" borderRadius="xl" bg="#e9f5ed" color="#31744c">
              <Icon as={ScrollText} boxSize="5" />
            </Flex>
            <Box>
              <Text fontWeight="semibold">Application service logs</Text>
              <Text fontSize="xs" color="gray.500">Times are displayed in your local timezone.</Text>
            </Box>
          </Flex>
          <Button size="sm" variant="outline" disabled={loadingServices || loadingLog || !date} onClick={() => setRevision((value) => value + 1)}>
            <Icon as={RefreshCw} boxSize="4" /> Refresh
          </Button>
        </Flex>

        <Flex mb="4" gap="3" wrap="wrap">
          <NativeSelect.Root minW="56" flex="1" disabled={loadingServices || services.length === 0}>
            <NativeSelect.Field aria-label="Choose service" value={serviceId} onChange={(event) => {
              const next = services.find((service) => service.id === event.target.value);
              setServiceId(next?.id ?? "");
              setDate(next?.dates[0] ?? "");
              setContent("");
            }}>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>

          <NativeSelect.Root minW="48" flex="1" disabled={!selectedService?.dates.length}>
            <NativeSelect.Field aria-label="Choose log date" value={date} onChange={(event) => setDate(event.target.value)}>
              {selectedService?.dates.map((logDate) => <option key={logDate} value={logDate}>{logDate}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Flex>

        {error ? <Text role="alert" mb="4" borderRadius="lg" bg="red.50" p="3" color="red.700" fontSize="sm">{error}</Text> : null}
        {truncated && !loadingLog ? <Text mb="3" fontSize="xs" color="gray.500">Showing the latest 2 MB of this log.</Text> : null}
        {loadingServices || loadingLog ? (
          <Flex minH="40" align="center" justify="center" gap="3" color="gray.500"><Spinner size="sm" /><Text fontSize="sm">Loading service log...</Text></Flex>
        ) : !date ? (
          <Flex minH="40" align="center" justify="center" color="gray.500"><Text fontSize="sm">No service logs are available yet.</Text></Flex>
        ) : error ? null : <StructuredLogViewer content={content} />}
      </Box>
    </>
  );
}
