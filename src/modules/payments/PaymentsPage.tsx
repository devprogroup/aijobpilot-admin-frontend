import { useEffect, useState, type FormEvent } from "react";
import { Box, Button, Dialog, Field, Flex, Input, Portal, Table, Text } from "@chakra-ui/react";
import { ArrowLeftRight, Pencil, RefreshCw, Settings } from "lucide-react";
import { api } from "../../api";
import type { AdminWallet, PaymentNetwork, PaymentReceivingAddresses } from "../../types";

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

export function PaymentsPage() {
  const [wallets, setWallets] = useState<AdminWallet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [transferWallet, setTransferWallet] = useState<AdminWallet | null>(null);
  const [editingWallet, setEditingWallet] = useState<AdminWallet | null>(null);
  const [editedBalance, setEditedBalance] = useState("");
  const [addresses, setAddresses] = useState<PaymentReceivingAddresses>(EMPTY_ADDRESSES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [updatingBalance, setUpdatingBalance] = useState(false);
  const [syncingWalletId, setSyncingWalletId] = useState<number | null>(null);
  const [syncNotice, setSyncNotice] = useState("");
  const [syncError, setSyncError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.paymentWallets(page);
      setWallets(result.wallets);
      setTotal(result.total);
      setPageSize(result.pageSize);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load payment addresses");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [page]);
  useEffect(() => {
    api.paymentReceivingAddresses().then(({ addresses: values }) => setAddresses(values))
      .catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load receiving addresses"));
  }, []);
  useEffect(() => {
    if (!settingsOpen) return;
    api.paymentReceivingAddresses().then(({ addresses: values }) => setAddresses(values))
      .catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load receiving addresses"));
  }, [settingsOpen]);

  const saveAddresses = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const configured = NETWORKS.filter(({ key }) => addresses[key].trim());
      if (!configured.length) throw new Error("Enter at least one receiving address.");
      await Promise.all(configured.map(({ key }) => api.updatePaymentReceivingAddress(key, addresses[key].trim())));
      setMessage("Receiving addresses saved.");
      setSettingsOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save receiving addresses");
    } finally { setSaving(false); }
  };

  const transfer = async () => {
    if (!transferWallet) return;
    setTransferring(true); setError(""); setMessage("");
    try {
      const result = await api.transferPayment(transferWallet.id);
      setMessage(`${amount(result.amount)} transferred. Transaction: ${result.txHash}`);
      setTransferWallet(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Transfer failed");
    } finally { setTransferring(false); }
  };

  const updateBalance = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingWallet) return;
    const balance = Number(editedBalance);
    if (!Number.isFinite(balance) || balance < 0) {
      setError("Enter a valid non-negative USDT balance.");
      return;
    }
    setUpdatingBalance(true); setError(""); setMessage("");
    try {
      await api.updatePaymentBalance(editingWallet.id, balance);
      setMessage(`Balance updated to ${amount(balance)}. The address is confirmed and the user's credit was adjusted.`);
      setEditingWallet(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update payment balance");
    } finally { setUpdatingBalance(false); }
  };

  const syncBalance = async (wallet: AdminWallet) => {
    setSyncingWalletId(wallet.id); setSyncError(""); setSyncNotice("");
    try {
      const result = await api.syncPaymentBalance(wallet.id);
      setEditedBalance(String(result.balance));
      setSyncNotice(`Fetched ${amount(result.balance)} from the network. Save to apply this balance.`);
    } catch (reason) {
      setSyncError(reason instanceof Error ? reason.message : "Unable to fetch network balance");
    } finally { setSyncingWalletId(null); }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <>
    <Flex as="header" mb="7" justify="space-between" align={{ base: "start", sm: "center" }} gap="4" flexWrap="wrap">
      <Box><Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Billing</Text><Text as="h1" m="0" fontSize="3xl" fontWeight="bold">Crypto payments</Text><Text mt="2" fontSize="sm" color="gray.500">Deposit addresses, received USDT, and transfers to your treasury.</Text></Box>
      <Flex gap="2"><Button variant="outline" bg="white" disabled={loading} onClick={() => void load()}>Refresh</Button><Button variant="outline" bg="white" onClick={() => { setError(""); setSettingsOpen(true); }}><Settings size={16} /> Receiving addresses</Button></Flex>
    </Flex>

    {(error || message) && <Box role={error ? "alert" : "status"} mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"} overflowWrap="anywhere">{error || message}</Box>}

    <Box overflowX="auto" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white">
      <Table.Root minW="1000px" size="sm">
        <Table.Header bg="gray.50"><Table.Row>{["Deposit address", "User", "Date and time", "Network", "Token", "Balance", "Status", ""].map((label, index) => <Table.ColumnHeader key={label || index} px="4" py="3">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
        <Table.Body>
          {loading || wallets.length === 0 ? <Table.Row><Table.Cell colSpan={8} py="8" textAlign="center" color="gray.500">{loading ? "Loading payment addresses…" : "No payment addresses yet."}</Table.Cell></Table.Row> : wallets.map(wallet => <Table.Row key={wallet.id}>
            <Table.Cell px="4" py="4" maxW="230" overflowWrap="anywhere" fontFamily="mono" fontSize="xs"><a href={explorerUrl(wallet.network, wallet.address)} target="_blank" rel="noopener noreferrer" title="View address on block explorer" style={{ color: "#15803d", textDecoration: "underline" }}>{wallet.address}</a></Table.Cell>
            <Table.Cell px="4" py="4"><Text fontWeight="semibold">{wallet.user.name || wallet.user.email || `User #${wallet.user.id}`}</Text><Text fontSize="xs" color="gray.500">{wallet.user.email || `#${wallet.user.id}`}</Text></Table.Cell>
            <Table.Cell px="4" py="4" whiteSpace="nowrap">{new Date(wallet.createdAt).toLocaleString()}</Table.Cell>
            <Table.Cell px="4" py="4" textTransform="uppercase">{wallet.network}</Table.Cell>
            <Table.Cell px="4" py="4">{wallet.token}</Table.Cell>
            <Table.Cell px="4" py="4" whiteSpace="nowrap"><Flex align="center" gap="2"><Text fontWeight="semibold">{amount(wallet.balance)}</Text><Button size="xs" variant="ghost" aria-label={`Update balance for address ${wallet.id}`} onClick={() => { setError(""); setSyncNotice(""); setSyncError(""); setEditedBalance(String(wallet.balance)); setEditingWallet(wallet); }}><Pencil size={12} /></Button></Flex></Table.Cell>
            <Table.Cell px="4" py="4"><Text textTransform="capitalize">{wallet.status}</Text></Table.Cell>
            <Table.Cell px="4" py="4"><Button size="sm" disabled={wallet.status !== "confirmed" || wallet.balance <= 0 || !addresses[wallet.network]} onClick={() => setTransferWallet(wallet)}><ArrowLeftRight size={14} />Transfer</Button></Table.Cell>
          </Table.Row>)}
        </Table.Body>
      </Table.Root>
      <Flex px="4" py="3" borderTop="1px solid" borderColor="gray.100" justify="space-between" align="center"><Text fontSize="sm" color="gray.500">{total} payment address{total === 1 ? "" : "es"}</Text><Flex align="center" gap="3"><Text fontSize="sm">Page {page} of {pages}</Text><Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || page >= pages} onClick={() => setPage(value => value + 1)}>Next</Button></Flex></Flex>
    </Box>

    <Dialog.Root open={settingsOpen} onOpenChange={({ open }) => !saving && setSettingsOpen(open)}>
      <Portal><Dialog.Backdrop bg="blackAlpha.600" /><Dialog.Positioner><Dialog.Content as="form" onSubmit={saveAddresses} maxW="xl" borderRadius="2xl" p="6">
        <Dialog.Title fontSize="lg" fontWeight="bold">Treasury receiving addresses</Dialog.Title>
        <Dialog.Description mt="1" mb="5" color="gray.500">Each network uses its own destination address. Transfers send the full available USDT balance.</Dialog.Description>
        <Flex direction="column" gap="4">{NETWORKS.map(({ key, label }) => <Field.Root key={key}><Field.Label>{label}</Field.Label><Input value={addresses[key]} onChange={event => setAddresses(current => ({ ...current, [key]: event.target.value }))} placeholder={key === "trc20" ? "T…" : "0x…"} /></Field.Root>)}</Flex>
        <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button><Button type="submit" loading={saving} colorPalette="green">Save addresses</Button></Flex>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>

    <Dialog.Root open={Boolean(editingWallet)} onOpenChange={({ open }) => !open && !updatingBalance && setEditingWallet(null)}>
      <Portal><Dialog.Backdrop bg="blackAlpha.600" /><Dialog.Positioner><Dialog.Content as="form" onSubmit={updateBalance} maxW="xl" borderRadius="2xl" p="6">
        <Dialog.Title fontSize="lg" fontWeight="bold">Update deposit balance</Dialog.Title>
        <Dialog.Description mt="1" mb="5" color="gray.500">Sync reads the on-chain balance into this field. Save to confirm the address and apply the balance change to the user's credit ledger.</Dialog.Description>
        {editingWallet && <Flex direction="column" gap="3" fontSize="sm">
          <Box><Text color="gray.500" fontSize="xs">Deposit address</Text><a href={explorerUrl(editingWallet.network, editingWallet.address)} target="_blank" rel="noopener noreferrer" style={{ color: "#15803d", textDecoration: "underline", overflowWrap: "anywhere" }}>{editingWallet.address}</a></Box>
          <Flex gap="8" flexWrap="wrap"><Box><Text color="gray.500" fontSize="xs">User</Text><Text>{editingWallet.user.name || `User #${editingWallet.user.id}`} ({editingWallet.user.email || "no email"})</Text></Box><Box><Text color="gray.500" fontSize="xs">User ID</Text><Text>{editingWallet.user.id}</Text></Box><Box><Text color="gray.500" fontSize="xs">Current user credit</Text><Text>{amount(editingWallet.user.credit)}</Text></Box><Box><Text color="gray.500" fontSize="xs">Address record ID</Text><Text>{editingWallet.id}</Text></Box></Flex>
          <Flex gap="8" flexWrap="wrap"><Box><Text color="gray.500" fontSize="xs">Created</Text><Text>{new Date(editingWallet.createdAt).toLocaleString()}</Text></Box><Box><Text color="gray.500" fontSize="xs">Network / token</Text><Text>{editingWallet.network.toUpperCase()} / {editingWallet.token}</Text></Box><Box><Text color="gray.500" fontSize="xs">Status</Text><Text textTransform="capitalize">{editingWallet.status}</Text></Box></Flex>
          <Box><Text color="gray.500" fontSize="xs">Expires</Text><Text>{editingWallet.expiresAt ? new Date(editingWallet.expiresAt).toLocaleString() : "—"}</Text></Box>
        </Flex>}
        <Flex mt="5" align="end" gap="3"><Field.Root flex="1"><Field.Label>Database balance (USDT)</Field.Label><Input type="number" min="0" step="0.000001" value={editedBalance} onChange={event => setEditedBalance(event.target.value)} required /></Field.Root><Button type="button" variant="outline" loading={syncingWalletId === editingWallet?.id} disabled={!editingWallet || syncingWalletId !== null || editingWallet.status === "transferring" || editingWallet.status === "transferred"} onClick={() => editingWallet && void syncBalance(editingWallet)}><RefreshCw size={14} />Get network balance</Button></Flex>
        {(syncNotice || syncError) && <Text mt="2" fontSize="sm" color={syncError ? "red.600" : "green.700"} role={syncError ? "alert" : "status"}>{syncError || syncNotice}</Text>}
        <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" disabled={updatingBalance || syncingWalletId !== null} onClick={() => setEditingWallet(null)}>Cancel</Button><Button type="submit" colorPalette="green" loading={updatingBalance}>Save balance</Button></Flex>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>

    <Dialog.Root open={Boolean(transferWallet)} onOpenChange={({ open }) => !open && !transferring && setTransferWallet(null)}>
      <Portal><Dialog.Backdrop bg="blackAlpha.600" /><Dialog.Positioner><Dialog.Content maxW="lg" borderRadius="2xl" p="6">
        <Dialog.Title fontSize="lg" fontWeight="bold">Transfer USDT?</Dialog.Title>
        <Dialog.Description mt="2" color="gray.600">Transfer the full available balance of {transferWallet ? amount(transferWallet.balance) : ""} from this {transferWallet?.network.toUpperCase()} deposit address to:</Dialog.Description>
        <Text mt="3" p="3" borderRadius="lg" bg="gray.50" fontFamily="mono" fontSize="sm" overflowWrap="anywhere">{transferWallet ? addresses[transferWallet.network] : ""}</Text>
        <Text mt="3" fontSize="xs" color="gray.500">Blockchain transfers cannot be reversed. Confirm the destination address before continuing.</Text>
        <Text mt="2" fontSize="xs" color="orange.700">The deposit address needs native network gas (ETH, BNB, or TRX) to send USDT.</Text>
        <Flex mt="6" justify="flex-end" gap="3"><Button variant="outline" disabled={transferring} onClick={() => setTransferWallet(null)}>Cancel</Button><Button colorPalette="green" loading={transferring} onClick={() => void transfer()}>Transfer funds</Button></Flex>
      </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
  </>;
}
