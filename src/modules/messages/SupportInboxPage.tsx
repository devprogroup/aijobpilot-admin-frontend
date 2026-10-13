import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Box, Button, Flex, Text, Textarea } from "@chakra-ui/react";
import { api, type SupportMessage } from "../../api";

const categoryLabel = { payment: "Payment", bug: "Bug", feedback: "Feedback", other: "Other" };

export function SupportInboxPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setMessages((await api.supportMessages()).messages); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load support messages."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const sendReply = async (event: FormEvent, message: SupportMessage) => {
    event.preventDefault();
    const content = (replies[message.id] ?? "").trim();
    if (!content) return;
    setBusyId(message.id); setError(""); setNotice("");
    try {
      await api.replyToSupportMessage(message.id, content);
      setReplies((current) => ({ ...current, [message.id]: "" }));
      setNotice(`Reply sent to ${message.userName || message.userEmail || "user"}.`);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to send reply."); }
    finally { setBusyId(null); }
  };

  const openAttachment = async (messageId: number, index: number) => {
    try {
      const url = await api.supportAttachment(messageId, index);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load attachment."); }
  };

  const markRead = async (messageId: number) => {
    try { await api.markSupportMessageRead(messageId); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to mark as read."); }
  };

  const roots = messages.filter((message) => message.replyId === null);
  return <>
    <Box mb="8">
      <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Support</Text>
      <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Support inbox</Text>
      <Text mt="2" fontSize="sm" color="gray.500">Review user requests and reply to their Messages inbox.</Text>
    </Box>
    {(error || notice) && <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"}>{error || notice}</Box>}
    {loading ? <Text color="gray.500">Loading support requests…</Text> : roots.length === 0 ? <Box border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p="8"><Text color="gray.500">No support requests yet.</Text></Box> : (
      <Flex direction="column" gap="4">
        {roots.map((message) => {
          const threadReplies = messages.filter((item) => item.replyId === message.id).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
          return <Box key={message.id} border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p={{ base: "5", md: "6" }}>
            <Flex justify="space-between" gap="4" wrap="wrap">
              <Box><Text fontWeight="bold" fontSize="lg">{message.title}</Text><Text mt="1" color="gray.500" fontSize="sm">{message.userName || "User"} · {message.userEmail || `User #${message.userId}`} · {categoryLabel[message.category]} · {new Date(message.dateTime).toLocaleString()}</Text></Box>
              <Flex align="center" gap="3">
                <Text fontSize="xs" color={message.isRead ? "gray.500" : "orange.600"}>{message.isRead ? "Read" : "Unread"}</Text>
                {!message.isRead && <Button size="xs" variant="outline" onClick={() => void markRead(message.id)}>Mark read</Button>}
              </Flex>
            </Flex>
            <Text mt="4" whiteSpace="pre-wrap" fontSize="sm">{message.content}</Text>
            {message.attachments.length > 0 && <Flex mt="4" gap="2" wrap="wrap">{message.attachments.map((file, index) => <Button key={file.storageKey} size="sm" variant="outline" onClick={() => void openAttachment(message.id, index)}>{file.fileName}</Button>)}</Flex>}
            {threadReplies.map((reply) => <Box key={reply.id} mt="4" ml={{ base: "0", md: "6" }} borderLeft="3px solid" borderColor="green.300" bg="gray.50" borderRadius="md" p="3"><Text fontWeight="semibold" fontSize="xs">Support · {new Date(reply.dateTime).toLocaleString()}</Text><Text mt="1" whiteSpace="pre-wrap" fontSize="sm">{reply.content}</Text></Box>)}
            <Box as="form" mt="5" onSubmit={(event) => void sendReply(event, message)}>
              <Textarea value={replies[message.id] ?? ""} onChange={(event) => setReplies((current) => ({ ...current, [message.id]: event.target.value }))} maxLength={10000} minH="100px" placeholder="Write a reply…" required />
              <Flex justify="flex-end" mt="3"><Button type="submit" loading={busyId === message.id} colorPalette="green" disabled={!replies[message.id]?.trim()}>Send reply</Button></Flex>
            </Box>
          </Box>;
        })}
      </Flex>
    )}
  </>;
}
