import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Box, Button, Flex, Icon, IconButton, Input, Table, Text } from "@chakra-ui/react";
import { Copy, Plus } from "lucide-react";
import { api } from "../../api";
import type { PromoCode } from "../../types";
import { useAuth } from "../../auth/AuthContext";
import { toaster } from "../../components/ui/toaster";

const statusStyles: Record<PromoCode["status"], { label: string; bg: string; color: string }> = {
  active: { label: "Active", bg: "green.50", color: "green.700" },
  used: { label: "Used", bg: "blue.50", color: "blue.700" },
  expired: { label: "Expired", bg: "gray.100", color: "gray.600" },
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export function PromoCodesPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [balance, setBalance] = useState(0);
  const [expireDays, setExpireDays] = useState<number | null>(null);
  const [freeCredit, setFreeCredit] = useState<number | null>(null);
  const [count, setCount] = useState("1");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.promoCodes();
      setCodes(data.promoCodes);
      setBalance(data.balance ?? 0);
      setExpireDays(data.expireDays);
      setFreeCredit(data.freeCredit);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load promo codes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(count);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      setError("Enter a number of codes between 1 and 100.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const result = await api.generatePromoCodes(amount);
      setBalance(result.balance ?? 0);
      toaster.create({
        title: `Generated ${result.promoCodes.length} promo code${result.promoCodes.length === 1 ? "" : "s"}.`,
        description: result.deletedExpired ? `Deleted ${result.deletedExpired} expired code${result.deletedExpired === 1 ? "" : "s"}.` : undefined,
        type: "success",
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to generate promo codes.");
    } finally {
      setGenerating(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toaster.create({ title: `Copied ${code}.`, type: "success" });
    } catch {
      setError("Unable to copy to the clipboard.");
    }
  };

  return (
    <>
      {!embedded && <Box as="header" mb="8">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Growth</Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Promo codes</Text>
        <Text mt="2" fontSize="sm" color="gray.500">
          Single-use signup codes. {isSuperAdmin ? "Super admins can generate codes without a balance limit" : "Each code takes one from your promo code balance"}
          {freeCredit !== null && <> and gives a new user {freeCredit} credit</>}
          {expireDays !== null && <>; unused codes expire after {expireDays} day{expireDays === 1 ? "" : "s"}</>}.
        </Text>
      </Box>}
      {error && <Box mb="5" borderRadius="xl" bg="red.50" p="4" fontSize="sm" color="red.700" role="alert">{error}</Box>}
      <Flex as="form" onSubmit={(event: FormEvent) => void generate(event)} mb="6" align="end" gap="4" flexWrap="wrap" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p="5">
        {embedded && <Text as="h2" w="full" m="0" fontSize="lg" fontWeight="bold">Promo code management</Text>}
        <Box>
          <Text fontSize="xs" textTransform="uppercase" color="gray.400" fontWeight="bold">Promo code balance</Text>
          <Text fontSize="2xl" fontWeight="bold">{isSuperAdmin ? "Unlimited" : balance}</Text>
        </Box>
        <label>
          <Text mb="1" fontSize="sm" fontWeight="semibold">Codes to generate</Text>
          <Input w="32" type="number" min={1} max={isSuperAdmin ? 100 : Math.max(1, Math.min(100, balance))} value={count} onChange={(event) => setCount(event.target.value)} />
        </label>
        <Button type="submit" bg="green.600" color="white" _hover={{ bg: "green.700" }} loading={generating} disabled={!isSuperAdmin && balance < 1}>
          <Icon as={Plus} boxSize="4" /> Generate
        </Button>
        {!isSuperAdmin && balance < 1 && <Text fontSize="sm" color="gray.500">Ask a super admin to add promo code balance.</Text>}
      </Flex>
      <Box as="section" overflow="hidden" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
        <Flex align="center" justify="space-between" borderBottom="1px solid" borderColor="gray.100" p="5">
          <Text m="0" fontWeight="bold">{isSuperAdmin ? "All promo codes" : "Your promo codes"}</Text>
          <Text fontSize="xs" color="gray.400">{codes.length} codes</Text>
        </Flex>
        <Box overflowX="auto">
          <Table.Root minW="900px" size="sm">
            <Table.Header bg="gray.50">
              <Table.Row>
                {["Code", "Status", "Created", "Expires", "Used", ...(isSuperAdmin ? ["Created by"] : [])].map((label) => (
                  <Table.ColumnHeader key={label} px="4" py="3" fontSize="xs" textTransform="uppercase" color="gray.400">{label}</Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {loading && codes.length === 0 && <Table.Row><Table.Cell colSpan={6} px="5" py="10" textAlign="center" color="gray.400">Loading promo codes…</Table.Cell></Table.Row>}
              {!loading && codes.length === 0 && <Table.Row><Table.Cell colSpan={6} px="5" py="10" textAlign="center" color="gray.400">No promo codes yet.</Table.Cell></Table.Row>}
              {codes.map((code) => (
                <Table.Row key={code.id} _hover={{ bg: "gray.50" }}>
                  <Table.Cell px="4" py="3">
                    <Flex align="center" gap="2">
                      <Text fontFamily="mono" fontWeight="semibold" letterSpacing="wider">{code.code}</Text>
                      <IconButton aria-label={`Copy ${code.code}`} size="xs" variant="ghost" onClick={() => void copy(code.code)}><Copy size={14} /></IconButton>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell px="4" py="3">
                    <Box as="span" borderRadius="md" px="2" py="1" fontSize="xs" fontWeight="semibold" bg={statusStyles[code.status].bg} color={statusStyles[code.status].color}>{statusStyles[code.status].label}</Box>
                  </Table.Cell>
                  <Table.Cell px="4" py="3" whiteSpace="nowrap">{formatDate(code.createdAt)}</Table.Cell>
                  <Table.Cell px="4" py="3" whiteSpace="nowrap">{code.status === "used" ? "—" : formatDate(code.expiresAt)}</Table.Cell>
                  <Table.Cell px="4" py="3" whiteSpace="nowrap">{code.usedAt ? `${formatDate(code.usedAt)}${code.usedBy ? ` · user #${code.usedBy}` : ""}` : "—"}</Table.Cell>
                  {isSuperAdmin && <Table.Cell px="4" py="3">{code.createdByEmail ?? `#${code.createdBy}`}</Table.Cell>}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
    </>
  );
}
