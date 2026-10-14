import { useEffect, useState, type FormEvent } from "react";
import { Box, Button, Dialog, Field, Flex, Input, Portal, Spinner, Table, Text } from "@chakra-ui/react";
import { Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { api } from "../../api";
import type { AdminDepositAddress, PaymentNetwork } from "../../types";

const amount = (value: number) => `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT`;
function explorerUrl(network: PaymentNetwork, address: string): string {
  if (network === "erc20") return `https://etherscan.io/address/${encodeURIComponent(address)}`;
  if (network === "bep20") return `https://bscscan.com/address/${encodeURIComponent(address)}`;
  throw new Error(`Unsupported network: ${network}`)
}
function transactionUrl(network: PaymentNetwork, hash: string): string {
  if (network === "erc20") return `https://etherscan.io/tx/${encodeURIComponent(hash)}`;
  if (network === "bep20") return `https://bscscan.com/tx/${encodeURIComponent(hash)}`;
  throw new Error(`Unsupported network: ${network}`);
}
function addressStatus(address: AdminDepositAddress): string {
  if (address.lease?.status === "pending") return "Reserved";
  if (address.lease?.status === "detected") return "Deposit detected";
  if (address.reservedUntil && new Date(address.reservedUntil) > new Date()) return "Reserved";
  return "Available";
}

export function PaymentsPage() {
  const [addresses, setAddresses] = useState<AdminDepositAddress[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [walletDialog, setWalletDialog] = useState<"add" | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletSaving, setWalletSaving] = useState(false);
  const [syncingWalletId, setSyncingWalletId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const result = await api.paymentDepositAddresses(page, searchQuery);
      setAddresses(result.addresses); setTotal(result.total); setPageSize(result.pageSize);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load wallets"); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearchQuery(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => { void load(); }, [page, searchQuery]);
  const openAddWallet = () => {
    setError(""); setWalletAddress(""); setWalletDialog("add");
  };
  const saveWallet = async (event: FormEvent) => {
    event.preventDefault(); setWalletSaving(true); setError(""); setMessage("");
    try {
      await api.addPaymentWallet(walletAddress.trim());
      setMessage("Wallet added.");
      setWalletDialog(null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save wallet."); }
    finally { setWalletSaving(false); }
  };
  const syncWalletBalance = async (wallet: AdminDepositAddress) => {
    setSyncingWalletId(wallet.id); setError(""); setMessage("");
    try {
      await api.syncPaymentWalletBalance(wallet.id);
      setMessage("Wallet balance synced from the network.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sync wallet balance."); }
    finally { setSyncingWalletId(null); }
  };
  const deleteWallet = async (wallet: AdminDepositAddress) => {
    if (!window.confirm(`Delete wallet ${wallet.address}?`)) return;
    setError(""); setMessage("");
    try { await api.deletePaymentWallet(wallet.id); setMessage("Wallet deleted."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete wallet."); }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <>
    <Flex as="header" mb="7" justify="space-between" align={{ base: "start", sm: "center" }} gap="4" flexWrap="wrap">
      <Box><Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Billing</Text><Text as="h1" m="0" fontSize="3xl" fontWeight="bold">Wallet management</Text><Text mt="2" fontSize="sm" color="gray.500">Manage deposit addresses, cached balances, and verified payments.</Text></Box>
      <Flex gap="2" flexWrap="wrap"><Button colorPalette="green" onClick={openAddWallet}><Plus size={16} /> Add wallet</Button><Button variant="outline" bg="white" disabled={loading} onClick={() => void load()}>Refresh</Button></Flex>
    </Flex>

    {(error || message) && <Box role={error ? "alert" : "status"} mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"} overflowWrap="anywhere">{error || message}</Box>}

    <Box mb="4" maxW="md" position="relative">
      <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="gray.500" pointerEvents="none"><Search size={16} /></Box>
      <Input aria-label="Search wallet addresses" placeholder="Search by wallet address" value={search} onChange={event => setSearch(event.target.value)} pl="10" bg="white" />
    </Box>

    <Box overflowX="auto" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white">
      <Table.Root minW="1020px" size="sm">
        <Table.Header bg="gray.50"><Table.Row>{["Wallet address", "USDT balance", "Current user", "Reservation", "Last payment", "Balance updated", "Actions"].map(label => <Table.ColumnHeader key={label} px="4" py="3">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
        <Table.Body>
          {loading || addresses.length === 0 ? <Table.Row><Table.Cell colSpan={8} py="8" textAlign="center" color="gray.500">{loading ? "Loading wallets..." : searchQuery ? "No wallets match this address." : "No wallets yet. Add a deposit wallet to accept payments."}</Table.Cell></Table.Row> : addresses.map(wallet => <Table.Row key={wallet.id}>
            <Table.Cell px="4" py="4" maxW="250" overflowWrap="anywhere" fontFamily="mono" fontSize="xs"><a href={explorerUrl(wallet.lastPayment?.network ?? "erc20", wallet.address)} target="_blank" rel="noopener noreferrer" title="View address on block explorer" style={{ color: "#15803d", textDecoration: "underline" }}>{wallet.address}</a><Text mt="1" fontSize="xs" color="gray.500">Wallet #{wallet.id}</Text></Table.Cell>
            <Table.Cell px="4" py="4" whiteSpace="nowrap">{amount(wallet.usdtBalance)}</Table.Cell>
            <Table.Cell px="4" py="4">{wallet.lease ? <><Text fontWeight="semibold">{wallet.lease.userName || `User #${wallet.lease.userId}`}</Text><Text fontSize="xs" color="gray.500">{wallet.lease.userEmail || `#${wallet.lease.userId}`}</Text></> : <Text color="gray.500">—</Text>}</Table.Cell>
            <Table.Cell px="4" py="4">{addressStatus(wallet)}{wallet.lease?.expiresAt && <Text fontSize="xs" color="gray.500">Until {new Date(wallet.lease.expiresAt).toLocaleString()}</Text>}</Table.Cell>
            <Table.Cell px="4" py="4">{wallet.lastPayment ? <><a href={transactionUrl(wallet.lastPayment.network, wallet.lastPayment.txHash)} target="_blank" rel="noopener noreferrer" style={{ color: "#15803d", textDecoration: "underline" }}>{amount(wallet.lastPayment.amount)}</a><Text mt="1" fontSize="xs" color="gray.500">{wallet.lastPayment.network.toUpperCase()} · {new Date(wallet.lastPayment.createdAt).toLocaleString()}</Text></> : <Text color="gray.500">None</Text>}</Table.Cell>
            <Table.Cell px="4" py="4" whiteSpace="nowrap">{wallet.balanceUpdatedAt ? new Date(wallet.balanceUpdatedAt).toLocaleString() : "Never"}</Table.Cell>
            <Table.Cell px="4" py="3"><Flex gap="2"><Button size="xs" variant="outline" disabled={syncingWalletId !== null} onClick={() => void syncWalletBalance(wallet)} aria-label={`Sync balance for wallet ${wallet.id}`}>{syncingWalletId === wallet.id ? <Spinner size="xs" /> : <RefreshCw size={13} />} Sync</Button><Button size="xs" variant="outline" colorPalette="red" disabled={Boolean(wallet.lease)} onClick={() => void deleteWallet(wallet)} aria-label={`Delete wallet ${wallet.id}`}><Trash2 size={13} /></Button></Flex></Table.Cell>
          </Table.Row>)}
        </Table.Body>
      </Table.Root>
      <Flex px="4" py="3" borderTop="1px solid" borderColor="gray.100" justify="space-between" align="center"><Text fontSize="sm" color="gray.500">{total} wallet{total === 1 ? "" : "s"}</Text><Flex align="center" gap="3"><Text fontSize="sm">Page {page} of {pages}</Text><Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || page >= pages} onClick={() => setPage(value => value + 1)}>Next</Button></Flex></Flex>
    </Box>

    <Dialog.Root open={walletDialog !== null} onOpenChange={({ open }) => !walletSaving && !open && setWalletDialog(null)}>
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content as="form" onSubmit={saveWallet} maxW="lg" p="6" borderRadius="2xl">
        <Dialog.Title fontSize="lg" fontWeight="bold">Add deposit wallet</Dialog.Title>
        <Flex mt="5" direction="column" gap="4">
          <Field.Root><Field.Label>Wallet address</Field.Label><Input value={walletAddress} onChange={event => setWalletAddress(event.target.value)} placeholder="0x..." required /></Field.Root>
        </Flex>
        <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" disabled={walletSaving} onClick={() => setWalletDialog(null)}>Cancel</Button><Button type="submit" loading={walletSaving} colorPalette="green">Add wallet</Button></Flex>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  </>;
}
