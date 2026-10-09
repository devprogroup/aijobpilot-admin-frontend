import { useEffect, useState, type FormEvent } from "react";
import { Box, Button, Dialog, Field, Flex, Input, Portal, Table, Text } from "@chakra-ui/react";
import { Settings } from "lucide-react";
import { api } from "../../api";
import type { AdminDepositAddress, PaymentNetwork, PaymentReceivingAddresses } from "../../types";

const NETWORKS: { key: PaymentNetwork; label: string }[] = [
  { key: "erc20", label: "Ethereum (ERC20)" },
  { key: "bep20", label: "BNB Smart Chain (BEP20)" },
  { key: "trc20", label: "TRON (TRC20)" },
];
const EMPTY_ADDRESSES: PaymentReceivingAddresses = { erc20: "", bep20: "", trc20: "" };
const amount = (value: number) => `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT`;
function explorerUrl(network: PaymentNetwork, address: string): string {
  if (network === "erc20") return `https://etherscan.io/address/${encodeURIComponent(address)}`;
  if (network === "bep20") return `https://bscscan.com/address/${encodeURIComponent(address)}`;
  return `https://tronscan.org/#/address/${encodeURIComponent(address)}`;
}
function addressStatus(address: AdminDepositAddress): string {
  if (address.lease?.status === "pending") return "Reserved";
  if (address.lease?.status === "detected") return "Deposit detected";
  if (address.lockedUntil && new Date(address.lockedUntil) > new Date()) return "Reserved";
  if (address.releasedAt) return "Cooling down";
  return "Available";
}

export function PaymentsPage() {
  const [addresses, setPoolAddresses] = useState<AdminDepositAddress[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [receivingAddresses, setReceivingAddresses] = useState<PaymentReceivingAddresses>(EMPTY_ADDRESSES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.paymentDepositAddresses(page);
      setPoolAddresses(result.addresses);
      setTotal(result.total);
      setPageSize(result.pageSize);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load payment addresses");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [page]);
  useEffect(() => {
    api.paymentReceivingAddresses().then(({ addresses: values }) => setReceivingAddresses(values))
      .catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load receiving addresses"));
  }, []);
  useEffect(() => {
    if (!settingsOpen) return;
    api.paymentReceivingAddresses().then(({ addresses: values }) => setReceivingAddresses(values))
      .catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load receiving addresses"));
  }, [settingsOpen]);

  const saveAddresses = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const configured = NETWORKS.filter(({ key }) => receivingAddresses[key].trim());
      if (!configured.length) throw new Error("Enter at least one receiving address.");
      await Promise.all(configured.map(({ key }) => api.updatePaymentReceivingAddress(key, receivingAddresses[key].trim())));
      setMessage("Receiving addresses saved.");
      setSettingsOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save receiving addresses");
    } finally { setSaving(false); }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <>
    <Flex as="header" mb="7" justify="space-between" align={{ base: "start", sm: "center" }} gap="4" flexWrap="wrap">
      <Box><Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Billing</Text><Text as="h1" m="0" fontSize="3xl" fontWeight="bold">Crypto payments</Text><Text mt="2" fontSize="sm" color="gray.500">Pooled deposit addresses, current reservations, and treasury destinations.</Text></Box>
      <Flex gap="2"><Button variant="outline" bg="white" disabled={loading} onClick={() => void load()}>Refresh</Button><Button variant="outline" bg="white" onClick={() => { setError(""); setSettingsOpen(true); }}><Settings size={16} /> Receiving addresses</Button></Flex>
    </Flex>

    {(error || message) && <Box role={error ? "alert" : "status"} mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"} overflowWrap="anywhere">{error || message}</Box>}

    <Box overflowX="auto" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white">
      <Table.Root minW="1000px" size="sm">
        <Table.Header bg="gray.50"><Table.Row>{["Deposit address", "Network", "USDT balance", "Native balance", "Current user", "Reservation", "Balance updated", "TRON active"].map(label => <Table.ColumnHeader key={label} px="4" py="3">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
        <Table.Body>
          {loading || addresses.length === 0 ? <Table.Row><Table.Cell colSpan={8} py="8" textAlign="center" color="gray.500">{loading ? "Loading payment addresses…" : "No pooled deposit addresses yet."}</Table.Cell></Table.Row> : addresses.map(address => <Table.Row key={address.id}>
            <Table.Cell px="4" py="4" maxW="250" overflowWrap="anywhere" fontFamily="mono" fontSize="xs"><a href={explorerUrl(address.network, address.address)} target="_blank" rel="noopener noreferrer" title="View address on block explorer" style={{ color: "#15803d", textDecoration: "underline" }}>{address.address}</a><Text mt="1" fontSize="xs" color="gray.500">Pool #{address.id}</Text></Table.Cell>
            <Table.Cell px="4" py="4" textTransform="uppercase">{address.network}</Table.Cell>
            <Table.Cell px="4" py="4" whiteSpace="nowrap">{amount(address.usdtBalance)}</Table.Cell>
            <Table.Cell px="4" py="4" whiteSpace="nowrap">{address.nativeBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })}</Table.Cell>
            <Table.Cell px="4" py="4">{address.lease ? <><Text fontWeight="semibold">{address.lease.userName || `User #${address.lease.userId}`}</Text><Text fontSize="xs" color="gray.500">{address.lease.userEmail || `#${address.lease.userId}`}</Text></> : <Text color="gray.500">—</Text>}</Table.Cell>
            <Table.Cell px="4" py="4">{addressStatus(address)}{address.lease?.expiresAt && <Text fontSize="xs" color="gray.500">Until {new Date(address.lease.expiresAt).toLocaleString()}</Text>}</Table.Cell>
            <Table.Cell px="4" py="4" whiteSpace="nowrap">{address.balanceUpdatedAt ? new Date(address.balanceUpdatedAt).toLocaleString() : "Never"}</Table.Cell>
            <Table.Cell px="4" py="4">{address.network === "trc20" ? (address.activated ? "Yes" : "No") : "—"}</Table.Cell>
          </Table.Row>)}
        </Table.Body>
      </Table.Root>
      <Flex px="4" py="3" borderTop="1px solid" borderColor="gray.100" justify="space-between" align="center"><Text fontSize="sm" color="gray.500">{total} pooled address{total === 1 ? "" : "es"}</Text><Flex align="center" gap="3"><Text fontSize="sm">Page {page} of {pages}</Text><Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || page >= pages} onClick={() => setPage(value => value + 1)}>Next</Button></Flex></Flex>
    </Box>

    <Dialog.Root open={settingsOpen} onOpenChange={({ open }) => !saving && setSettingsOpen(open)}>
      <Portal><Dialog.Backdrop bg="blackAlpha.600" /><Dialog.Positioner><Dialog.Content as="form" onSubmit={saveAddresses} maxW="xl" borderRadius="2xl" p="6">
        <Dialog.Title fontSize="lg" fontWeight="bold">Treasury receiving addresses</Dialog.Title>
        <Dialog.Description mt="1" mb="5" color="gray.500">These are the destinations configured for the payment collector.</Dialog.Description>
        <Flex direction="column" gap="4">{NETWORKS.map(({ key, label }) => <Field.Root key={key}><Field.Label>{label}</Field.Label><Input value={receivingAddresses[key]} onChange={event => setReceivingAddresses(current => ({ ...current, [key]: event.target.value }))} placeholder={key === "trc20" ? "T…" : "0x…"} /></Field.Root>)}</Flex>
        <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button><Button type="submit" loading={saving} colorPalette="green">Save addresses</Button></Flex>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  </>;
}
