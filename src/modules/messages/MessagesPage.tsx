import { useEffect, useState, type FormEvent } from "react";
import { Box, Button, Field, Flex, Input, NativeSelect, Text } from "@chakra-ui/react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import type { User } from "../../types";
import { RichTextEditor } from "../email-templates/RichTextEditor";
import { MAX_CONTENT_LENGTH, messageHasText } from "./sanitizeMessageHtml";
import { SupportInboxPage } from "./SupportInboxPage";

type Recipient = "all" | "user";
type Variant = "info" | "success" | "warning" | "error";

function SendMessageTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [recipient, setRecipient] = useState<Recipient>("user");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [variant, setVariant] = useState<Variant>("info");
  /** important: the client app opens it in a dialog on the next sign-in / app load until dismissed. */
  const [level, setLevel] = useState<"normal" | "important">("normal");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.users().then(({ users: rows }) => {
      const activeUsers = rows.filter((user) => user.status === "active");
      setUsers(activeUsers);
      if (activeUsers.length) setUserId(String(activeUsers[0].id));
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load users."))
      .finally(() => setLoadingUsers(false));
  }, []);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!messageHasText(content)) {
      setError("Write a message before sending.");
      return;
    }
    setSending(true);
    try {
      const result = await api.sendUserMessage({
        recipient,
        ...(recipient === "user" ? { userId: Number(userId) } : {}),
        title: title.trim(),
        content: content.trim(),
        variant,
        level,
      });
      setSuccess(`Message sent to ${result.sent} ${result.sent === 1 ? "user" : "users"}.`);
      setTitle("");
      setContent("");
      setLevel("normal");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  return <>
    <Box mb="8">
      <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Messaging</Text>
      <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Send a message</Text>
      <Text mt="2" fontSize="sm" color="gray.500">Send an in-app message to an individual user or all active users.</Text>
    </Box>

    {(error || success) && <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"}>{error || success}</Box>}

    <Box as="form" onSubmit={send} maxW="3xl" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p={{ base: "5", md: "7" }}>
      <Flex direction="column" gap="5">
        <Field.Root>
          <Field.Label>Send to</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field value={recipient} onChange={(event) => setRecipient(event.target.value as Recipient)}>
              <option value="user">One user</option>
              <option value="all">All active users ({users.length})</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>

        {recipient === "user" && <Field.Root required>
          <Field.Label>User</Field.Label>
          <NativeSelect.Root disabled={loadingUsers || users.length === 0}>
            <NativeSelect.Field value={userId} onChange={(event) => setUserId(event.target.value)}>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name ? `${user.name} · ` : ""}{user.email || user.username}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          {!loadingUsers && users.length === 0 && <Field.HelperText>There are no active users.</Field.HelperText>}
        </Field.Root>}

        <Field.Root>
          <Field.Label>Title</Field.Label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} required placeholder="Message title" />
        </Field.Root>

        <Field.Root required invalid={content.length > MAX_CONTENT_LENGTH}>
          <Field.Label>Message</Field.Label>
          <Box w="full"><RichTextEditor value={content} onChange={setContent} /></Box>
          {content.length > MAX_CONTENT_LENGTH
            ? <Field.ErrorText>The formatted message is too long ({content.length.toLocaleString()} of {MAX_CONTENT_LENGTH.toLocaleString()} characters including formatting).</Field.ErrorText>
            : <Field.HelperText>Format with the toolbar: bold, italic, headings, lists and links.</Field.HelperText>}
        </Field.Root>

        <Field.Root>
          <Field.Label>Message type</Field.Label>
          <NativeSelect.Root maxW="xs">
            <NativeSelect.Field value={variant} onChange={(event) => setVariant(event.target.value as Variant)}>
              <option value="info">Information</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>

        <Field.Root>
          <Field.Label>Importance</Field.Label>
          <NativeSelect.Root maxW="xs">
            <NativeSelect.Field value={level} onChange={(event) => setLevel(event.target.value as "normal" | "important")}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Field.HelperText>Important messages open in a dialog the next time the user signs in or loads the app, until they dismiss it.</Field.HelperText>
        </Field.Root>

        {recipient === "all" && <Text fontSize="sm" color="orange.700" bg="orange.50" borderRadius="lg" p="3">This will send a message to all {users.length} active users.</Text>}

        <Flex justify="flex-end">
          <Button type="submit" loading={sending} disabled={loadingUsers || (recipient === "user" && users.length === 0) || content.length > MAX_CONTENT_LENGTH} bg="green.600" color="white" _hover={{ bg: "green.700" }}>Send message</Button>
        </Flex>
      </Flex>
    </Box>
  </>;
}

export function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "support" ? "support" : "send";

  const selectTab = (tab: "send" | "support") => {
    setSearchParams(tab === "support" ? { tab: "support" } : {}, { replace: true });
  };

  return (
    <Box>
      <Flex gap="2" mb="6" borderBottom="1px solid" borderColor="gray.200" role="tablist" aria-label="Message sections">
        <Button role="tab" aria-selected={activeTab === "send"} onClick={() => selectTab("send")} variant="ghost" borderBottom="2px solid" borderColor={activeTab === "send" ? "green.600" : "transparent"} borderRadius="0" color={activeTab === "send" ? "green.700" : "gray.600"}>Send message</Button>
        <Button role="tab" aria-selected={activeTab === "support"} onClick={() => selectTab("support")} variant="ghost" borderBottom="2px solid" borderColor={activeTab === "support" ? "green.600" : "transparent"} borderRadius="0" color={activeTab === "support" ? "green.700" : "gray.600"}>Support inbox</Button>
      </Flex>
      {activeTab === "support" ? <SupportInboxPage /> : <SendMessageTab />}
    </Box>
  );
}
