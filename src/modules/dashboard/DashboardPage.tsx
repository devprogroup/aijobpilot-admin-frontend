import { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, Grid, Icon, Spinner, Text } from "@chakra-ui/react";
import { AlertTriangle, Bot, Cpu, HardDrive, MemoryStick, Network, RefreshCw, Server, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { api } from "../../api";
import type { AppConfig, ProviderBalance, ServiceHealth, SystemMetrics } from "../../types";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

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
] as const;

type SettlingStatus = {
  periods: [string, string][];
  multiplier: number | null;
  active: boolean;
  configured: boolean;
};

function isSettlingPeriodActive(periods: [string, string][], now = new Date()): boolean {
  const secondsNow = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  const seconds = (time: string) => {
    const [hours, minutes, secondsPart] = time.split(":").map(Number);
    return hours! * 3600 + minutes! * 60 + secondsPart!;
  };
  return periods.some(([from, to]) => {
    const start = seconds(from);
    const end = seconds(to);
    return start <= end ? secondsNow >= start && secondsNow < end : secondsNow >= start || secondsNow < end;
  });
}

function readSettlingStatus(settings: AppConfig[]): SettlingStatus {
  const values = new Map<string, string>(settings.map(({ key, value }) => [key, value] as const));
  let periods: [string, string][] = [];
  let validPeriods = false;
  try {
    const parsed: unknown = JSON.parse(values.get("SETTLING_PERIODS") ?? "");
    if (Array.isArray(parsed) && parsed.every((period) =>
      Array.isArray(period) && period.length === 2 &&
      [period[0], period[1]].every((time) => typeof time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)),
    )) {
      periods = parsed as [string, string][];
      validPeriods = true;
    }
  } catch {
    // The dashboard shows a configuration warning below.
  }
  const parsedMultiplier = Number(values.get("SETTLING_PERIOD_MULTIPLIER"));
  const validMultiplier = Number.isFinite(parsedMultiplier) && parsedMultiplier > 0;
  return {
    periods,
    multiplier: validMultiplier ? parsedMultiplier : null,
    active: isSettlingPeriodActive(periods),
    configured: validPeriods && validMultiplier,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(1)} ${unit}`;
}

function MetricCard({
  title,
  icon,
  value,
  detail,
  percent,
}: {
  title: string;
  icon: typeof Cpu;
  value: string;
  detail: string;
  percent?: number | null;
}) {
  return (
    <Box borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" p="5" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
      <Flex align="center" gap="3">
        <Flex h="10" w="10" align="center" justify="center" borderRadius="xl" bg="green.50" color="green.700">
          <Icon as={icon} boxSize="5" />
        </Flex>
        <Text fontSize="sm" fontWeight="semibold" color="gray.600">{title}</Text>
      </Flex>
      <Text mt="5" fontSize="2xl" fontWeight="bold" fontVariantNumeric="tabular-nums">{value}</Text>
      <Text mt="1" fontSize="xs" color="gray.500">{detail}</Text>
      {percent !== undefined && percent !== null && (
        <Box mt="4" h="1.5" overflow="hidden" borderRadius="full" bg="gray.100" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${title} usage`}>
          <Box h="full" w={`${Math.max(0, Math.min(100, percent))}%`} borderRadius="full" bg="green.500" transition="width 300ms" />
        </Box>
      )}
    </Box>
  );
}

function SystemMetricsSection({ metrics }: { metrics: SystemMetrics | null }) {
  const memoryPercent = metrics ? metrics.memory.usedBytes / metrics.memory.totalBytes * 100 : null;
  const storagePercent = metrics ? metrics.storage.usedBytes / metrics.storage.totalBytes * 100 : null;
  const networkDetail = metrics?.network
    ? `↓ ${formatBytes(metrics.network.receivedBytesPerSecond)}/s  ↑ ${formatBytes(metrics.network.sentBytesPerSecond)}/s`
    : "Sampling network traffic";
  return (
    <Box mb="8">
      <Flex mb="3" align="end" justify="space-between" gap="3">
        <Box>
          <Text fontWeight="bold">Resource usage</Text>
          <Text mt="1" fontSize="xs" color="gray.400">Host running the admin backend · updates every 15 seconds</Text>
        </Box>
        {metrics && <Text fontSize="xs" color="gray.400">Updated {new Date(metrics.sampledAt).toLocaleTimeString()}</Text>}
      </Flex>
      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap="4">
        <MetricCard title="CPU" icon={Cpu} value={metrics?.cpu.percent == null ? "—" : `${metrics.cpu.percent.toFixed(1)}%`} detail={metrics ? `${metrics.cpu.cores} logical cores` : "Waiting for sample"} percent={metrics?.cpu.percent} />
        <MetricCard title="Memory" icon={MemoryStick} value={metrics ? `${memoryPercent!.toFixed(1)}%` : "—"} detail={metrics ? `${formatBytes(metrics.memory.usedBytes)} of ${formatBytes(metrics.memory.totalBytes)}` : "Waiting for sample"} percent={memoryPercent} />
        <MetricCard title="Network" icon={Network} value={metrics?.network ? `${formatBytes(metrics.network.receivedBytesPerSecond + metrics.network.sentBytesPerSecond)}/s` : "—"} detail={networkDetail} />
        <MetricCard title="Storage" icon={HardDrive} value={metrics ? `${storagePercent!.toFixed(1)}%` : "—"} detail={metrics ? `${formatBytes(metrics.storage.usedBytes)} of ${formatBytes(metrics.storage.totalBytes)} · FILES_ROOT volume` : "Waiting for sample"} percent={storagePercent} />
      </Grid>
    </Box>
  );
}

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
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
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
  const [paymentBalance, setPaymentBalance] = useState<number | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [settlingStatus, setSettlingStatus] = useState<SettlingStatus | null>(null);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

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

  const loadPaymentBalance = useCallback(async () => {
    if (!isSuperAdmin) { setPaymentBalance(null); return; }
    try { setPaymentBalance((await api.paymentSummary()).totalBalance); }
    catch { setPaymentBalance(null); }
  }, [isSuperAdmin]);

  const loadSystemMetrics = useCallback(async () => {
    try { setSystemMetrics(await api.systemMetrics()); }
    catch { setSystemMetrics(null); }
  }, []);

  const loadSettlingStatus = useCallback(async () => {
    try { setSettlingStatus(readSettlingStatus((await api.settings()).settings)); }
    catch { setSettlingStatus(null); }
  }, []);

  const runCleanup = async () => {
    setCleanupRunning(true);
    setCleanupMessage(null);
    try {
      const report = await api.triggerCleanup();
      const expiredJobs = report.jobs?.removed ?? 0;
      const tempFolders = report.files?.removedTempDateFolders ?? 0;
      const logFolders = report.files?.removedLogDateFolders ?? 0;
      const summary = `Cleanup removed ${expiredJobs} jobs, ${tempFolders} temp folders, and ${logFolders} log folders.`;
      setCleanupMessage(report.errors.length ? `${summary} ${report.errors.join(" ")}` : summary);
    } catch (error) {
      setCleanupMessage(error instanceof Error ? error.message : "Cleanup failed.");
    } finally {
      setCleanupRunning(false);
    }
  };

  const refresh = useCallback(() => {
    void loadServices();
    void loadDeepSeekBalance();
    void loadTwoCaptchaBalance();
    void loadPaymentBalance();
    void loadSystemMetrics();
    void loadSettlingStatus();
  }, [loadDeepSeekBalance, loadPaymentBalance, loadServices, loadSettlingStatus, loadSystemMetrics, loadTwoCaptchaBalance]);
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
        <Flex direction="column" align="end" gap="2">
          <Flex align="center" gap="2">
            <Button variant="outline" bg="white" onClick={runCleanup} disabled={cleanupRunning}>
              {cleanupRunning ? <Spinner size="sm" /> : <Icon as={Trash2} boxSize="4" />}
              Run cleanup
            </Button>
            <Button variant="outline" bg="white" onClick={refresh}>
              {refreshing ? <Spinner size="sm" /> : <Icon as={RefreshCw} boxSize="4" />}
              Refresh
            </Button>
          </Flex>
          {cleanupMessage && <Text maxW="sm" textAlign="right" fontSize="xs" color={cleanupMessage.toLowerCase().includes("cleanup:") || cleanupMessage.toLowerCase().includes("failed") ? "red.600" : "gray.500"}>{cleanupMessage}</Text>}
        </Flex>
      </Flex>

      {settlingStatus && (
        <Box mb="6" maxW="2xl" borderRadius="2xl" border="1px solid" borderColor={settlingStatus.active || !settlingStatus.periods.length || !settlingStatus.configured ? "orange.200" : "blue.200"} bg={settlingStatus.active || !settlingStatus.periods.length || !settlingStatus.configured ? "orange.50" : "blue.50"} p="5">
          <Flex align="start" gap="3">
            <Icon as={AlertTriangle} mt="0.5" color={settlingStatus.active || !settlingStatus.periods.length || !settlingStatus.configured ? "orange.600" : "blue.600"} />
            <Box>
              <Text fontWeight="bold">
                {settlingStatus.active ? "Settling period active" : settlingStatus.periods.length ? "Application settling periods" : "No settling periods configured"}
              </Text>
              <Text mt="1" fontSize="sm" color="gray.700">
                {settlingStatus.periods.length
                  ? `${settlingStatus.periods.map(([from, to]) => `${from}–${to} UTC`).join(", ")} · ${settlingStatus.multiplier ?? "?"}× application pricing`
                  : "Applications are charged at their standard price until UTC windows are configured."}
              </Text>
              {!settlingStatus.configured && <Text mt="1" fontSize="xs" color="orange.800">Settling period settings are missing or invalid. Update them in App settings.</Text>}
              {!settlingStatus.periods.length && <Link to="/settings" style={{ color: "#9a3412", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>Configure settling periods</Link>}
            </Box>
          </Flex>
        </Box>
      )}

      <SystemMetricsSection metrics={systemMetrics} />

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

      {isSuperAdmin && <Box mb="8" maxW="2xl" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" p="5" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
        <Flex align="center" justify="space-between" gap="4">
          <Box><Text fontWeight="bold">USDT payment balance</Text><Text mt="1" fontSize="xs" color="gray.400">Across confirmed customer deposit addresses</Text></Box>
          <Text fontSize="2xl" fontWeight="bold">{paymentBalance === null ? "—" : `${paymentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT`}</Text>
        </Flex>
        <Link to="/wallets" style={{ textDecoration: "none" }}><Button mt="3" size="sm" variant="outline">Manage wallets</Button></Link>
      </Box>}

      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          xl: "repeat(4, 1fr)",
        }}
        gap="4"
      >
        {serviceDefinitions
          .map((definition) => {
            const service = services.find((item) => item.id === definition.id);
            const loading = serviceLoading[definition.id];
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
