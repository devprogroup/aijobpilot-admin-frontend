import { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, Grid, Icon, Spinner, Text } from "@chakra-ui/react";
import { Activity, RefreshCw, Server } from "lucide-react";
import { api } from "../../api";
import type { ServiceHealth } from "../../types";

export function DashboardPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setServices((await api.serviceHealth()).services);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to check services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const running = services.filter((service) => service.running).length;

  return (
    <>
      <Flex as="header" mb="8" align={{ base: "start", sm: "center" }} justify="space-between" gap="4">
        <Box>
          <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">System</Text>
          <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Dashboard</Text>
          <Text mt="2" fontSize="sm" color="gray.500">{services.length ? `${running} of ${services.length} services running` : "Checking service availability"}</Text>
        </Box>
        <Button variant="outline" bg="white" disabled={loading} onClick={() => { setLoading(true); void load(); }}>
          {loading ? <Spinner size="sm" /> : <Icon as={RefreshCw} boxSize="4" />}
          Refresh
        </Button>
      </Flex>

      {error && <Box mb="5" borderRadius="xl" bg="red.50" p="4" fontSize="sm" color="red.700">{error}</Box>}

      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(5, 1fr)" }} gap="4">
        {services.map((service) => (
          <Box key={service.id} borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" p="5" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
            <Flex align="center" justify="space-between" gap="3">
              <Flex h="10" w="10" align="center" justify="center" borderRadius="xl" bg={service.running ? "green.50" : "red.50"} color={service.running ? "green.700" : "red.600"}>
                <Icon as={Server} boxSize="5" />
              </Flex>
              <Flex align="center" gap="2" fontSize="xs" fontWeight="bold" color={service.running ? "green.700" : "red.600"}>
                <Box h="2" w="2" borderRadius="full" bg={service.running ? "green.400" : "red.400"} />
                {service.running ? "RUNNING" : "UNAVAILABLE"}
              </Flex>
            </Flex>
            <Text mt="5" fontWeight="bold">{service.name}</Text>
            <Text mt="1" fontSize="xs" color="gray.400">Checked {new Date(service.checkedAt).toLocaleTimeString()}</Text>
          </Box>
        ))}
        {loading && services.length === 0 && <Flex gridColumn="1 / -1" minH="40" align="center" justify="center" color="gray.400"><Icon as={Activity} boxSize="5" mr="2" />Checking services…</Flex>}
      </Grid>
    </>
  );
}
