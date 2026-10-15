import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Box, Button, Flex, Input, Text, Textarea } from "@chakra-ui/react";
import { api } from "../../api";
import type { FaqScope, ManagedFaq } from "../../types";

type FaqDraft = Pick<ManagedFaq, "question" | "answer" | "scope" | "sortOrder" | "isActive">;
const emptyDraft: FaqDraft = { question: "", answer: "", scope: null, sortOrder: 0, isActive: true };

export function FaqsContentPage() {
  const [faqs, setFaqs] = useState<ManagedFaq[]>([]);
  const [draft, setDraft] = useState<FaqDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    void api.faqs().then(({ faqs: rows }) => setFaqs(rows)).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load FAQs.")).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const reset = () => { setDraft(emptyDraft); setEditingId(null); setFormOpen(false); setError(""); };
  const edit = (faq: ManagedFaq) => {
    setFormOpen(true);
    setEditingId(faq.id);
    setDraft({ question: faq.question, answer: faq.answer, scope: faq.scope, sortOrder: faq.sortOrder, isActive: faq.isActive });
    setError(""); setMessage("");
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const payload = { ...draft, question: draft.question.trim(), answer: draft.answer.trim() };
      if (editingId === null) await api.createFaq(payload); else await api.updateFaq(editingId, payload);
      const savedMessage = editingId === null ? "FAQ created." : "FAQ updated.";
      reset(); setMessage(savedMessage); load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save FAQ."); }
    finally { setSaving(false); }
  };
  const remove = async (faq: ManagedFaq) => {
    if (!window.confirm(`Delete this FAQ?\n\n${faq.question}`)) return;
    setError(""); setMessage("");
    try { await api.deleteFaq(faq.id); setMessage("FAQ deleted."); load(); if (editingId === faq.id) reset(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete FAQ."); }
  };

  return (
    <>
      <Flex mb="5" align={{ base: "start", sm: "center" }} justify="space-between" gap="3" flexWrap="wrap">
        <Box><Text as="h2" fontSize="xl" fontWeight="bold">Frequently asked questions</Text><Text mt="1" fontSize="sm" color="gray.500">Active entries appear on the Help page selected by their scope. Shared FAQs appear on both pages.</Text></Box>
        <Button colorPalette="green" onClick={() => { setDraft(emptyDraft); setEditingId(null); setFormOpen(true); setError(""); setMessage(""); }}>Add FAQ</Button>
      </Flex>
      {(error || message) && <Box mb="4" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="3" fontSize="sm" color={error ? "red.700" : "green.700"} role={error ? "alert" : "status"}>{error || message}</Box>}
      {formOpen && (
        <Box as="form" onSubmit={(event: FormEvent) => void save(event)} mb="5" border="1px solid" borderColor="gray.200" borderRadius="xl" bg="white" p={{ base: "4", md: "5" }}>
          <Text mb="4" fontWeight="semibold">{editingId === null ? "New FAQ" : "Edit FAQ"}</Text>
          <label><Text mb="1" fontSize="sm" fontWeight="medium">Question</Text><Input value={draft.question} onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))} maxLength={300} required /></label>
          <label><Text mt="4" mb="1" fontSize="sm" fontWeight="medium">Answer</Text><Textarea value={draft.answer} onChange={(event) => setDraft((current) => ({ ...current, answer: event.target.value }))} minH="160px" resize="vertical" required /></label>
          <Flex mt="4" align="center" gap="5" flexWrap="wrap">
            <label><Text mb="1" fontSize="sm" fontWeight="medium">Scope</Text><select className="input" value={draft.scope ?? "both"} onChange={(event) => setDraft((current) => ({ ...current, scope: event.target.value === "both" ? null : event.target.value as Exclude<FaqScope, null> }))}><option value="both">Both help pages</option><option value="public">Public help</option><option value="private">Private help</option></select></label>
            <label><Text mb="1" fontSize="sm" fontWeight="medium">Display order</Text><Input type="number" min={0} max={1000000} value={draft.sortOrder} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))} w="36" /></label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))} /> Show on selected Help page(s)</label>
            <Flex ml="auto" gap="2"><Button type="button" variant="outline" onClick={reset}>Cancel</Button><Button type="submit" colorPalette="green" loading={saving}>Save FAQ</Button></Flex>
          </Flex>
        </Box>
      )}
      <Box overflow="hidden" border="1px solid" borderColor="gray.200" borderRadius="xl" bg="white">
        {loading ? <Text p="7" textAlign="center" color="gray.500">Loading FAQs…</Text> : faqs.length === 0 ? <Text p="7" textAlign="center" color="gray.500">No FAQs have been added.</Text> : faqs.map((faq) => (
          <Flex key={faq.id} align={{ base: "start", md: "center" }} justify="space-between" gap="4" p="4" borderBottom="1px solid" borderColor="gray.100" flexDir={{ base: "column", md: "row" }}>
            <Box minW="0"><Flex gap="2" align="center" flexWrap="wrap"><Text fontWeight="semibold">{faq.question}</Text><Text fontSize="xs" color={faq.isActive ? "green.700" : "gray.500"}>{faq.isActive ? "Active" : "Hidden"}</Text></Flex><Text mt="1" fontSize="sm" color="gray.600" whiteSpace="pre-wrap">{faq.answer}</Text><Flex mt="2" gap="4" fontSize="xs" color="gray.400"><Text>Scope: {faq.scope ?? "Both"}</Text><Text>Display order: {faq.sortOrder}</Text></Flex></Box>
            <Flex shrink="0" gap="2"><Button size="sm" variant="outline" onClick={() => edit(faq)}>Edit</Button><Button size="sm" variant="outline" colorPalette="red" onClick={() => void remove(faq)}>Delete</Button></Flex>
          </Flex>
        ))}
      </Box>
    </>
  );
}
