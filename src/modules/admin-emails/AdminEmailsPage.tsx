import { useEffect, useState } from "react";
import { Box, Button, Dialog, Flex, Input, NativeSelect, Portal, Table, Text } from "@chakra-ui/react";
import { Eye, RefreshCw, Trash2 } from "lucide-react";
import { api } from "../../api";
import { PagePicker } from "../../components/PagePicker";
import type { AdminEmail, AdminEmailSummary, EmailStatusFilter } from "../../types";

const pageSize = 25;
const statusLabels: Record<EmailStatusFilter, string> = {
  all: "All emails",
  available: "Available to application",
  consumed: "Consumed",
  expired: "Expired",
};

function emailStatus(email: AdminEmailSummary) {
  if (email.consumedAt) return "Consumed";
  if (new Date(email.expiresAt).getTime() <= Date.now()) return "Expired";
  return "Available";
}

function readableBody(email: AdminEmail): string {
  if (email.bodyText?.trim()) return email.bodyText;
  if (!email.bodyHtml) return "(No message body stored.)";
  const document = new DOMParser().parseFromString(email.bodyHtml, "text/html");
  document.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
  return document.body.innerText?.trim() || document.body.textContent?.trim() || "(No readable message text.)";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function AdminEmailsPage() {
  const [emails, setEmails] = useState<AdminEmailSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EmailStatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [revision, setRevision] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const deleteEmail = async (email: { id: number; subject: string }) => {
    if (!window.confirm(`Delete the email "${email.subject || "(no subject)"}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteEmail(email.id);
      if (emails.length === 1 && page > 1) setPage(page - 1);
      else setRevision((current) => current + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete the email.");
    } finally {
      setDeleting(false);
    }
  };

  /** Deletes every email matching the applied search and status filter, not just this page. */
  const deleteAll = async () => {
    const scope = search || status !== "all" ? " matching the current search and filter" : "";
    if (!window.confirm(`Delete all ${total.toLocaleString()} emails${scope}? This cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteAllEmails(search, status);
      setPage(1);
      setRevision((current) => current + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete emails.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.emails(page, search, status).then((result) => {
      if (!active) return;
      setEmails(result.emails);
      setTotal(result.total);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load emails.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, status, revision]);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    setLoadingDetail(true);
    setSelectedEmail(null);
    setDetailError("");
    api.email(selectedId).then(({ email }) => { if (active) setSelectedEmail(email); })
      .catch((reason: unknown) => { if (active) setDetailError(reason instanceof Error ? reason.message : "Unable to load this email."); })
      .finally(() => { if (active) setLoadingDetail(false); });
    return () => { active = false; };
  }, [selectedId]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return <>
    <Box mb="6">
      <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Operations</Text>
      <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Admin emails</Text>
      <Text mt="2" maxW="760px" fontSize="sm" color="gray.500">Read messages delivered to addresses ending in @aijobpilot.co through Cloudflare Email Routing.</Text>
    </Box>

    {error && <Box mb="4" role="alert" borderRadius="xl" bg="red.50" p="4" color="red.700" fontSize="sm">{error}</Box>}
    <Box overflow="hidden" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white">
      <Flex px="5" py="4" borderBottom="1px solid" borderColor="gray.100" justify="space-between" align={{ base: "stretch", md: "center" }} gap="3" flexDir={{ base: "column", md: "row" }}>
        <Box><Text fontWeight="semibold">Mailbox</Text><Text fontSize="sm" color="gray.500">{total.toLocaleString()} matching {total === 1 ? "email" : "emails"}</Text></Box>
        <Flex as="form" gap="2" flexWrap="wrap" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
          <Input aria-label="Search emails" size="sm" w={{ base: "full", md: "64" }} placeholder="Search sender, recipient, subject…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          <NativeSelect.Root size="sm" w="48"><NativeSelect.Field aria-label="Filter emails" value={status} onChange={(event) => { setStatus(event.target.value as EmailStatusFilter); setPage(1); }}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
          <Button type="submit" size="sm" variant="outline">Search</Button>
          <Button type="button" size="sm" variant="ghost" aria-label="Refresh emails" onClick={() => setRevision((current) => current + 1)}><RefreshCw size={15} /></Button>
          <Button type="button" size="sm" variant="outline" colorPalette="red" disabled={loading || deleting || total === 0} onClick={() => void deleteAll()}><Trash2 size={15} /> Delete all</Button>
        </Flex>
      </Flex>
      <Box overflowX="auto">
        <Table.Root minW="1050px" size="sm">
          <Table.Header><Table.Row><Table.ColumnHeader>Received</Table.ColumnHeader><Table.ColumnHeader>From</Table.ColumnHeader><Table.ColumnHeader>To</Table.ColumnHeader><Table.ColumnHeader>Subject</Table.ColumnHeader><Table.ColumnHeader>Status</Table.ColumnHeader><Table.ColumnHeader>Expires</Table.ColumnHeader><Table.ColumnHeader>Actions</Table.ColumnHeader></Table.Row></Table.Header>
          <Table.Body>
            {!loading && emails.length === 0 && <Table.Row><Table.Cell colSpan={7}><Text py="7" textAlign="center" color="gray.500">No emails found.</Text></Table.Cell></Table.Row>}
            {emails.map((email) => <Table.Row key={email.id}>
              <Table.Cell whiteSpace="nowrap">{formatDate(email.receivedAt)}</Table.Cell>
              <Table.Cell maxW="52" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{email.fromAddress}</Table.Cell>
              <Table.Cell maxW="52" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{email.toAddress}</Table.Cell>
              <Table.Cell maxW="64" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={email.subject}>{email.subject}</Table.Cell>
              <Table.Cell><Text color={emailStatus(email) === "Available" ? "green.700" : "gray.500"}>{emailStatus(email)}</Text></Table.Cell>
              <Table.Cell whiteSpace="nowrap">{formatDate(email.expiresAt)}</Table.Cell>
              <Table.Cell><Flex gap="2"><Button size="xs" variant="outline" onClick={() => setSelectedId(email.id)}><Eye size={14} /> View</Button><Button size="xs" variant="outline" colorPalette="red" disabled={deleting} aria-label={`Delete email ${email.subject}`} onClick={() => void deleteEmail(email)}><Trash2 size={14} /> Delete</Button></Flex></Table.Cell>
            </Table.Row>)}
            {loading && <Table.Row><Table.Cell colSpan={7}><Text py="7" textAlign="center" color="gray.500">Loading emails…</Text></Table.Cell></Table.Row>}
          </Table.Body>
        </Table.Root>
      </Box>
      <Flex px="5" py="3" borderTop="1px solid" borderColor="gray.100" align="center" justify="space-between"><Text fontSize="sm" color="gray.500">Page {page} of {totalPages}</Text><PagePicker page={page} totalPages={totalPages} disabled={loading} onChange={setPage} /></Flex>
    </Box>

    <Dialog.Root open={selectedId !== null} onOpenChange={({ open }) => { if (!open) { setSelectedId(null); setSelectedEmail(null); setDetailError(""); } }} size="xl">
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content mx="4" maxH="90vh" borderRadius="2xl">
        <Dialog.Header pb="2"><Box minW="0"><Dialog.Title fontSize="lg" fontWeight="bold">{selectedEmail?.subject || "Email"}</Dialog.Title><Dialog.Description mt="1" fontSize="sm" color="gray.500">{selectedEmail ? `Received ${formatDate(selectedEmail.receivedAt)}` : "Message details"}</Dialog.Description></Box><Dialog.CloseTrigger /></Dialog.Header>
        <Dialog.Body overflowY="auto" pb="6">
          {loadingDetail && <Text color="gray.500">Loading email…</Text>}
          {detailError && <Text role="alert" color="red.600">{detailError}</Text>}
          {selectedEmail && <>
            <Box borderRadius="xl" bg="gray.50" p="4" mb="4">
              <Text fontSize="sm"><Text as="span" fontWeight="semibold">From: </Text>{selectedEmail.fromAddress}</Text>
              <Text mt="1" fontSize="sm"><Text as="span" fontWeight="semibold">To: </Text>{selectedEmail.toAddress}</Text>
              <Text mt="1" fontSize="sm"><Text as="span" fontWeight="semibold">Status: </Text>{emailStatus(selectedEmail)}{selectedEmail.consumedAt ? ` at ${formatDate(selectedEmail.consumedAt)}` : ""}</Text>
              <Text mt="1" fontSize="sm"><Text as="span" fontWeight="semibold">Expires: </Text>{formatDate(selectedEmail.expiresAt)}</Text>
            </Box>
            <Box border="1px solid" borderColor="gray.200" borderRadius="xl" p="4" maxH="55vh" overflowY="auto">
              <Text fontSize="sm" whiteSpace="pre-wrap" overflowWrap="anywhere">{readableBody(selectedEmail)}</Text>
            </Box>
          </>}
        </Dialog.Body>
        <Dialog.Footer><Button variant="outline" onClick={() => { setSelectedId(null); setSelectedEmail(null); }}>Close</Button></Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  </>;
}
