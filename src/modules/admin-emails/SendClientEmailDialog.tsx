import { useEffect, useState } from "react";
import { Box, Button, Dialog, Flex, Input, NativeSelect, Portal, Text, Textarea } from "@chakra-ui/react";
import { Send, X } from "lucide-react";
import { api } from "../../api";
import type { ApplicationFilterUser, ClientMailingResult, EmailTemplate } from "../../types";

type RecipientMode = "all" | "selected";

const emptyForm = { fromName: "AI JobPilot", fromEmailId: "no-reply", subject: "", body: "" };

/** A template's text with its parameters replaced by their defaults; the per-client placeholders stay for sending. */
function applyTemplateDefaults(text: string, template: EmailTemplate) {
  return (template.parameters ?? []).reduce((result, parameter) => (
    parameter.default === undefined || ["name", "username", "email"].includes(parameter.name)
      ? result
      : result.replaceAll(`{{${parameter.name}}}`, parameter.default)
  ), text);
}

const userLabel = (user: ApplicationFilterUser) => user.name || user.username;

/** Compose one email and send it to every client with an email address, or to hand-picked clients. */
export function SendClientEmailDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [bodyMode, setBodyMode] = useState<"edit" | "preview">("edit");
  const [mode, setMode] = useState<RecipientMode>("all");
  const [selected, setSelected] = useState<ApplicationFilterUser[]>([]);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<ApplicationFilterUser[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ClientMailingResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setTemplateId("");
    setBodyMode("edit");
    setMode("all");
    setSelected([]);
    setSearch("");
    setError("");
    setResult(null);
    api.emailTemplates().then((value) => setTemplates(value.emailTemplates)).catch(() => setTemplates([]));
  }, [open]);

  // Client search for the "Selected clients" mode, debounced like the applications filter.
  useEffect(() => {
    if (!open || mode !== "selected") return;
    let active = true;
    const timer = setTimeout(() => {
      api.applicationFilterUsers(search.trim()).then((value) => { if (active) setMatches(value.users); }).catch(() => undefined);
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [open, mode, search]);

  const chooseTemplate = (value: string) => {
    setTemplateId(value);
    const template = templates.find((entry) => String(entry.id) === value);
    if (!template) return;
    setForm({
      fromName: template.fromName,
      fromEmailId: template.fromEmailId,
      subject: applyTemplateDefaults(template.title, template),
      body: applyTemplateDefaults(template.body, template),
    });
  };

  const addRecipient = (user: ApplicationFilterUser) => {
    if (!user.email) return;
    setSelected((current) => (current.some((entry) => entry.id === user.id) ? current : [...current, user]));
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setResult(null);
    if (mode === "selected" && selected.length === 0) { setError("Pick at least one client."); return; }
    const who = mode === "all" ? "every client with an email address" : `${selected.length} selected ${selected.length === 1 ? "client" : "clients"}`;
    if (!window.confirm(`Send "${form.subject.trim() || "(no subject)"}" to ${who}?`)) return;
    setSending(true);
    try {
      const sent = await api.sendClientEmail({
        recipients: mode === "all" ? "all" : selected.map((user) => user.id),
        fromName: form.fromName.trim(),
        fromEmailId: form.fromEmailId.trim(),
        subject: form.subject.trim(),
        body: form.body.trim(),
      });
      setResult(sent);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to send the email.");
    } finally {
      setSending(false);
    }
  };

  const labelStyle = { mb: "1", fontSize: "xs", fontWeight: "semibold", color: "gray.500" } as const;

  return (
    <Dialog.Root open={open} onOpenChange={({ open: isOpen }) => { if (!isOpen && !sending) onClose(); }} size="xl">
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content as="form" mx="4" maxH="90vh" borderRadius="2xl" onSubmit={(event: React.FormEvent) => void send(event)}>
        <Dialog.Header pb="2"><Box minW="0"><Dialog.Title fontSize="lg" fontWeight="bold">Send email to clients</Dialog.Title><Dialog.Description mt="1" fontSize="sm" color="gray.500">Sent from @aijobpilot.co through Resend. Use {"{{name}}"}, {"{{username}}"} or {"{{email}}"} in the subject or body to personalise each message.</Dialog.Description></Box><Dialog.CloseTrigger disabled={sending} /></Dialog.Header>
        <Dialog.Body overflowY="auto" pb="4">
          {error && <Box mb="4" role="alert" borderRadius="xl" bg="red.50" p="3" color="red.700" fontSize="sm">{error}</Box>}
          {result && <Box mb="4" role="status" borderRadius="xl" bg={result.failed ? "orange.50" : "green.50"} p="3" color={result.failed ? "orange.800" : "green.800"} fontSize="sm">
            <Text>Sent to {result.sent.toLocaleString()} of {result.recipients.toLocaleString()} {result.recipients === 1 ? "client" : "clients"}{result.failed ? `, ${result.failed.toLocaleString()} failed` : ""}{result.skipped ? `, ${result.skipped.toLocaleString()} skipped without an email address` : ""}.</Text>
            {result.errors.slice(0, 10).map((message) => <Text key={message} mt="1" fontSize="xs">{message}</Text>)}
            {result.errors.length > 10 && <Text mt="1" fontSize="xs">…and {result.errors.length - 10} more.</Text>}
          </Box>}

          <Flex gap="3" flexDir={{ base: "column", md: "row" }} mb="4">
            <Box flex="1">
              <Text {...labelStyle}>Recipients</Text>
              <NativeSelect.Root size="sm"><NativeSelect.Field aria-label="Recipients" value={mode} onChange={(event) => setMode(event.target.value as RecipientMode)}><option value="all">All clients with an email address</option><option value="selected">Selected clients</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
            </Box>
            <Box flex="1">
              <Text {...labelStyle}>Start from a template (optional)</Text>
              <NativeSelect.Root size="sm"><NativeSelect.Field aria-label="Email template" value={templateId} onChange={(event) => chooseTemplate(event.target.value)}><option value="">Blank email</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
            </Box>
          </Flex>

          {mode === "selected" && <Box mb="4" border="1px solid" borderColor="gray.200" borderRadius="xl" p="3">
            <Text {...labelStyle}>Selected clients ({selected.length})</Text>
            <Flex gap="2" flexWrap="wrap" mb="3">
              {selected.length === 0 && <Text fontSize="sm" color="gray.500">No clients picked yet. Search below and add them.</Text>}
              {selected.map((user) => <Flex key={user.id} align="center" gap="1" borderRadius="full" bg="gray.100" px="3" py="1" fontSize="xs">
                <Text>{userLabel(user)} · {user.email}</Text>
                <Button type="button" size="2xs" variant="ghost" aria-label={`Remove ${userLabel(user)}`} onClick={() => setSelected((current) => current.filter((entry) => entry.id !== user.id))}><X size={12} /></Button>
              </Flex>)}
            </Flex>
            <Input aria-label="Search clients" size="sm" placeholder="Search by name, username or email…" value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" />
            <Box mt="2" maxH="40" overflowY="auto">
              {matches.length === 0 && <Text px="1" py="1" fontSize="xs" color="gray.500">No matching clients.</Text>}
              {matches.map((user) => {
                const picked = selected.some((entry) => entry.id === user.id);
                return <Flex key={user.id} align="center" justify="space-between" gap="2" px="1" py="1" fontSize="xs" borderBottom="1px solid" borderColor="gray.50">
                  <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{userLabel(user)}{user.email ? ` · ${user.email}` : " · no email address"} #{user.id}</Text>
                  <Button type="button" size="2xs" variant="outline" disabled={picked || !user.email} onClick={() => addRecipient(user)}>{picked ? "Added" : "Add"}</Button>
                </Flex>;
              })}
            </Box>
          </Box>}

          <Flex gap="3" flexDir={{ base: "column", md: "row" }} mb="4">
            <Box flex="1"><Text {...labelStyle}>From name</Text><Input required size="sm" maxLength={100} value={form.fromName} onChange={(event) => setForm((current) => ({ ...current, fromName: event.target.value }))} /></Box>
            <Box flex="1"><Text {...labelStyle}>From email ID</Text><Flex align="center" gap="2"><Input required size="sm" maxLength={64} value={form.fromEmailId} onChange={(event) => setForm((current) => ({ ...current, fromEmailId: event.target.value }))} placeholder="no-reply" /><Text whiteSpace="nowrap" fontSize="sm" color="gray.500">@aijobpilot.co</Text></Flex></Box>
          </Flex>
          <Box mb="4"><Text {...labelStyle}>Subject</Text><Input required size="sm" maxLength={500} value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></Box>
          <Box>
            <Flex align="center" justify="space-between" mb="1">
              <Text {...labelStyle} mb="0">Body (HTML)</Text>
              <Flex gap="1">
                <Button type="button" size="xs" variant={bodyMode === "edit" ? "solid" : "ghost"} colorPalette={bodyMode === "edit" ? "green" : undefined} onClick={() => setBodyMode("edit")}>Edit</Button>
                <Button type="button" size="xs" variant={bodyMode === "preview" ? "solid" : "ghost"} colorPalette={bodyMode === "preview" ? "green" : undefined} onClick={() => setBodyMode("preview")}>Preview</Button>
              </Flex>
            </Flex>
            {bodyMode === "edit"
              ? <Textarea required rows={12} fontFamily="mono" fontSize="xs" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} placeholder="<p>Hello {{name}},</p>" />
              : <Box border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden">
                {form.body.trim()
                  ? <iframe title="Email preview" srcDoc={form.body} sandbox="" style={{ width: "100%", height: 320, border: 0 }} />
                  : <Flex h="320px" align="center" justify="center"><Text color="gray.500">Enter HTML to preview the email.</Text></Flex>}
              </Box>}
          </Box>
        </Dialog.Body>
        <Dialog.Footer gap="2">
          <Button type="button" variant="outline" disabled={sending} onClick={onClose}>Close</Button>
          <Button type="submit" colorPalette="green" loading={sending} disabled={sending || (mode === "selected" && selected.length === 0)}><Send size={15} /> {mode === "all" ? "Send to all clients" : `Send to ${selected.length || ""} selected`}</Button>
        </Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  );
}
