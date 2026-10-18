import { useEffect, useState } from "react";
import { Box, Button, Flex, Table, Text } from "@chakra-ui/react";
import { api } from "../../../api";
import { PagePicker } from "../../../components/PagePicker";
import { StatusBadge } from "../../../components/ui/StatusBadge";

function transactionLink(network: "erc20" | "bep20" | null, hash: string | null): string | null {
  if (!network || !hash) return null;
  return network === "erc20" ? `https://etherscan.io/tx/${encodeURIComponent(hash)}` : `https://bscscan.com/tx/${encodeURIComponent(hash)}`;
}

export function UserPaymentHistory({ userId }: { userId: number }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.userPayments>> | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.userPayments(userId, page).then((result) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
      if (page > lastPage) setPage(lastPage);
      else setData(result);
    }).catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : "Unable to load payments"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, page, revision]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return <Box bg="white" borderRadius="2xl" p="5" mt="6">
    <Flex justify="space-between" align="center" mb="4"><Box><Text fontWeight="bold">Top-up history{data ? ` (${data.total})` : ""}</Text><Text fontSize="xs" color="gray.500">Confirmed and pending credit top-ups</Text></Box><Button size="sm" variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button></Flex>
    {error && <Text role="alert" color="red.600" mb="3">{error}</Text>}
    <Box overflowX="auto"><Table.Root size="sm" minW="700px">
      <Table.Header><Table.Row>{["Transaction", "Date", "Amount", "Network", "Status", "Block explorer"].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
      <Table.Body>
        {loading || error || !data?.payments.length ? <Table.Row><Table.Cell colSpan={6} py="6">{loading ? "Loading top-ups..." : error ? "Use Refresh to retry." : "No top-ups yet."}</Table.Cell></Table.Row> : data.payments.map((payment) => {
          const href = transactionLink(payment.network, payment.txHash);
          return <Table.Row key={payment.id}><Table.Cell>#{payment.id}</Table.Cell><Table.Cell>{new Date(payment.createdAt).toLocaleString()}</Table.Cell><Table.Cell>{payment.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDT</Table.Cell><Table.Cell>{payment.network?.toUpperCase() || "—"}</Table.Cell><Table.Cell><StatusBadge status={payment.status || "unknown"} /></Table.Cell><Table.Cell>{href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#15803d", textDecoration: "underline" }}>View transaction</a> : "—"}</Table.Cell></Table.Row>;
        })}
      </Table.Body>
    </Table.Root></Box>
    <Flex mt="4" justify="space-between" align="center" gap="3" wrap="wrap"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2" align="center"><PagePicker page={page} totalPages={pages} onChange={setPage} disabled={loading || !!error} /><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage(page + 1)}>Next</Button></Flex></Flex>
  </Box>;
}
