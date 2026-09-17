import { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, Grid, Icon, Spinner, Text } from "@chakra-ui/react";
import { Bot, RefreshCw, Server, ShieldCheck, WalletCards } from "lucide-react";
import { api } from "../../api";
import type { ProviderBalance, ServiceHealth } from "../../types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const serviceDefinitions = [
  { id: "redis", name: "Redis" },
  { id: "ats-engine", name: "ATS Engine" },
  { id: "crawler-backend", name: "Crawler Backend" },
  { id: "client-backend", name: "Client Backend" },
  { id: "crawler-worker", name: "Crawler Worker" },
] as const;

function BalanceCard({
  balance,
  loading,
}: {
  balance: ProviderBalance;
  loading: boolean;
}) {
  const deepseek = balance.provider === "deepseek";
  const twoCaptcha = balance.provider === "2captcha";
  const BalanceIcon = deepseek ? Bot : twoCaptcha ? ShieldCheck : WalletCards;
  return (
    <Box
      borderRadius="2xl"
      border="1px solid"
      borderColor="gray.200"
      bg="white"
      p="5"
      boxShadow="0 12px 35px rgba(24, 43, 34, .07)"
    >
      <Flex align="center" justify="space-between" gap="3">
        <Flex align="center" gap="3">
          <Flex
            h="10"
            w="10"
            align="center"
            justify="center"
            borderRadius="xl"
            bg={deepseek ? "blue.50" : twoCaptcha ? "orange.50" : "green.50"}
            color={
              deepseek ? "blue.600" : twoCaptcha ? "orange.600" : "green.700"
            }
          >
            <Icon as={BalanceIcon} boxSize="5" />
          </Flex>
          <Box>
            <Text fontWeight="bold" textTransform="capitalize">
              {balance.provider}
            </Text>
            <Text fontSize="xs" color="gray.400">
              API credit balance
            </Text>
          </Box>
        </Flex>
        {loading && (
          <Spinner size="sm" color={deepseek ? "blue.500" : "green.600"} />
        )}
      </Flex>
      <Text mt="5" fontSize="3xl" fontWeight="bold">
        {balance.amount === null ? "—" : money.format(balance.amount)}
      </Text>
      {balance.error && (
        <Text mt="2" fontSize="xs" color="red.600" title={balance.error}>
          {balance.error}
        </Text>
      )}
    </Box>
  );
}

function BalanceLoadingCard({
  provider,
}: {
  provider: ProviderBalance["provider"];
}) {
  const label =
    provider === "deepseek"
      ? "DeepSeek"
      : provider === "openai"
        ? "OpenAI"
        : "2Captcha";
  return (
    <Flex
      minH="40"
      align="center"
      justify="center"
      borderRadius="2xl"
      border="1px solid"
      borderColor="gray.200"
      bg="white"
      color="gray.400"
    >
      <Spinner size="sm" mr="2" />
      Loading {label} balance…
    </Flex>
  );
}

export function DashboardPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [serviceLoading, setServiceLoading] = useState<Record<string, boolean>>(
    Object.fromEntries(serviceDefinitions.map(({ id }) => [id, true])),
  );
  const [deepSeekLoading, setDeepSeekLoading] = useState(true);
  const [openAiLoading, setOpenAiLoading] = useState(true);
  const [twoCaptchaLoading, setTwoCaptchaLoading] = useState(true);
  const [deepSeekBalance, setDeepSeekBalance] =
    useState<ProviderBalance | null>(null);
  const [openAiBalance, setOpenAiBalance] = useState<ProviderBalance | null>(
    null,
  );
  const [twoCaptchaBalance, setTwoCaptchaBalance] =
    useState<ProviderBalance | null>(null);

  const loadServices = useCallback(async () => {
    await Promise.all(
      serviceDefinitions.map(async ({ id, name }) => {
        setServiceLoading((current) => ({ ...current, [id]: true }));
        let service: ServiceHealth;
        try {
          service = await api.serviceHealth(id);
        } catch {
          service = {
            id,
            name,
            running: false,
            checkedAt: new Date().toISOString(),
          };
        } finally {
          setServiceLoading((current) => ({ ...current, [id]: false }));
        }
        setServices((current) => [
          ...current.filter((item) => item.id !== id),
          service,
        ]);
      }),
    );
  }, []);

  const loadDeepSeekBalance = useCallback(async () => {
    setDeepSeekLoading(true);
    try {
      setDeepSeekBalance(await api.deepSeekBalance());
    } catch (caught) {
      setDeepSeekBalance({
        provider: "deepseek",
        amount: null,
        currency: "USD",
        updatedAt: new Date().toISOString(),
        error:
          caught instanceof Error ? caught.message : "Unable to load balance",
      });
    } finally {
      setDeepSeekLoading(false);
    }
  }, []);

  const loadTwoCaptchaBalance = useCallback(async () => {
    setTwoCaptchaLoading(true);
    try {
      setTwoCaptchaBalance(await api.twoCaptchaBalance());
    } catch (caught) {
      setTwoCaptchaBalance({
        provider: "2captcha",
        amount: null,
        currency: "USD",
        updatedAt: new Date().toISOString(),
        error:
          caught instanceof Error ? caught.message : "Unable to load balance",
      });
    } finally {
      setTwoCaptchaLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    void loadServices();
    void loadDeepSeekBalance();
    void loadTwoCaptchaBalance();
  }, [loadDeepSeekBalance, loadServices, loadTwoCaptchaBalance]);
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const running = services.filter((service) => service.running).length;
  const refreshing =
    Object.values(serviceLoading).some(Boolean) ||
    deepSeekLoading ||
    twoCaptchaLoading;

  return (
    <>
      <Flex
        as="header"
        mb="8"
        align={{ base: "start", sm: "center" }}
        justify="space-between"
        gap="4"
      >
        <Box>
          <Text
            mb="2"
            fontSize="xs"
            fontWeight="bold"
            letterSpacing="0.18em"
            textTransform="uppercase"
            color="#498366"
          >
            System
          </Text>
          <Text
            as="h1"
            m="0"
            fontSize="3xl"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Dashboard
          </Text>
          <Text mt="2" fontSize="sm" color="gray.500">
            {services.length
              ? `${running} of ${serviceDefinitions.length} services running`
              : "Checking service availability"}
          </Text>
        </Box>
        <Button variant="outline" bg="white" onClick={refresh}>
          {refreshing ? (
            <Spinner size="sm" />
          ) : (
            <Icon as={RefreshCw} boxSize="4" />
          )}
          Refresh
        </Button>
      </Flex>

      <Box mb="8">
        <Text fontWeight="bold">Provider balances</Text>
        <Text mt="1" mb="3" fontSize="xs" color="gray.400">
          Current API credit
        </Text>
        <Grid
          templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }}
          gap="4"
          maxW="2xl"
        >
          {deepSeekLoading && !deepSeekBalance ? (
            <BalanceLoadingCard provider="deepseek" />
          ) : (
            deepSeekBalance && (
              <BalanceCard
                balance={deepSeekBalance}
                loading={deepSeekLoading}
              />
            )
          )}
          {/* {openAiLoading && !openAiBalance ? <BalanceLoadingCard provider="openai" /> : openAiBalance && <BalanceCard balance={openAiBalance} loading={openAiLoading} />} */}
          {twoCaptchaLoading && !twoCaptchaBalance ? (
            <BalanceLoadingCard provider="2captcha" />
          ) : (
            twoCaptchaBalance && (
              <BalanceCard
                balance={twoCaptchaBalance}
                loading={twoCaptchaLoading}
              />
            )
          )}
        </Grid>
      </Box>

      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          xl: "repeat(4, 1fr)",
        }}
        gap="4"
      >
        {serviceDefinitions
          .filter((definition) => definition.id !== "crawler-worker")
          .map((definition) => {
            const service = services.find((item) => item.id === definition.id);
            const loading = serviceLoading[definition.id];
            if (definition.id === "crawler-backend") {
              return (
                <Box
                  key={definition.id}
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="white"
                  p="5"
                  boxShadow="0 12px 35px rgba(24, 43, 34, .07)"
                >
                  <Flex align="center" gap="3" mb="4">
                    <Icon as={Server} boxSize="5" color="gray.500" />
                    <Text fontWeight="bold">Crawler</Text>
                  </Flex>
                  {[
                    { id: "crawler-backend", label: "Backend" },
                    { id: "crawler-worker", label: "Worker" },
                  ].map(({ id, label }) => {
                    const status = services.find((item) => item.id === id);
                    const checking = serviceLoading[id];
                    return (
                      <Box key={id} mt="3">
                        <Flex justify="space-between" align="center" gap="2">
                          <Text fontSize="sm">{label}</Text>
                          <Flex
                            align="center"
                            gap="2"
                            fontSize="xs"
                            fontWeight="bold"
                            color={
                              !status
                                ? "gray.500"
                                : status.running
                                  ? "green.700"
                                  : "red.600"
                            }
                          >
                            {checking ? (
                              <Spinner size="xs" />
                            ) : (
                              <Box
                                h="2"
                                w="2"
                                borderRadius="full"
                                bg={status?.running ? "green.400" : "red.400"}
                              />
                            )}
                            {checking && !status
                              ? "CHECKING"
                              : status?.running
                                ? "RUNNING"
                                : "UNAVAILABLE"}
                          </Flex>
                        </Flex>
                        <Text mt="1" fontSize="xs" color="gray.400">
                          {status
                            ? `Checked ${new Date(status.checkedAt).toLocaleTimeString()}`
                            : "Waiting for health check"}
                        </Text>
                      </Box>
                    );
                  })}
                </Box>
              );
            }
            return (
              <Box
                key={definition.id}
                borderRadius="2xl"
                border="1px solid"
                borderColor="gray.200"
                bg="white"
                p="5"
                boxShadow="0 12px 35px rgba(24, 43, 34, .07)"
              >
                <Flex align="center" justify="space-between" gap="3">
                  <Flex
                    h="10"
                    w="10"
                    align="center"
                    justify="center"
                    borderRadius="xl"
                    bg={service?.running ? "green.50" : "red.50"}
                    color={service?.running ? "green.700" : "red.600"}
                  >
                    <Icon as={Server} boxSize="5" />
                  </Flex>
                  <Flex
                    align="center"
                    gap="2"
                    fontSize="xs"
                    fontWeight="bold"
                    color={service?.running ? "green.700" : "red.600"}
                  >
                    {loading ? (
                      <Spinner size="xs" />
                    ) : (
                      <Box
                        h="2"
                        w="2"
                        borderRadius="full"
                        bg={service?.running ? "green.400" : "red.400"}
                      />
                    )}
                    {loading && !service
                      ? "CHECKING"
                      : service?.running
                        ? "RUNNING"
                        : "UNAVAILABLE"}
                  </Flex>
                </Flex>
                <Text mt="5" fontWeight="bold">
                  {definition.name}
                </Text>
                <Text mt="1" fontSize="xs" color="gray.400">
                  {service
                    ? `Checked ${new Date(service.checkedAt).toLocaleTimeString()}`
                    : "Waiting for health check"}
                </Text>
              </Box>
            );
          })}
      </Grid>
    </>
  );
}
