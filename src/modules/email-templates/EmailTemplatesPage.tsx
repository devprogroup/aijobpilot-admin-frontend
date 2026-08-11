import { useEffect, useState } from "react";
import { Box, Button, Dialog, Flex, Input, Portal, Table, Text, Textarea } from "@chakra-ui/react";
import { api } from "../../api";
import type { EmailTemplate, EmailTemplatePayload } from "../../types";
import { RichTextEditor } from "./RichTextEditor";

const emptyForm = { name: "", title: "", body: "", parameters: "[]" };

export function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null | undefined>(undefined);
  const [form, setForm] = useState(emptyForm);
  const [deleteTemplate, setDeleteTemplate] = useState<EmailTemplate | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => setTemplates((await api.emailTemplates()).emailTemplates);

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load email templates"));
  }, []);

  const openForm = (template?: EmailTemplate) => {
    setEditing(template ?? null);
    setForm(template ? {
      name: template.name,
      title: template.title,
      body: template.body,
      parameters: JSON.stringify(template.parameters ?? [], null, 2),
    } : emptyForm);
    setError("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const parsed = JSON.parse(form.parameters);
      if (!Array.isArray(parsed)) throw new Error("Parameters must be a JSON array");
      const payload: EmailTemplatePayload = {
        name: form.name.trim(),
        title: form.title.trim(),
        body: form.body.trim(),
        parameters: parsed,
      };
      if (editing) await api.updateEmailTemplate(editing.id, payload);
      else await api.createEmailTemplate(payload);
      await load();
      setEditing(undefined);
      setMessage(`Email template ${editing ? "updated" : "created"}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save email template");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTemplate) return;
    setError("");
    try {
      await api.deleteEmailTemplate(deleteTemplate.id);
      setDeleteTemplate(null);
      await load();
      setMessage("Email template deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete email template");
    }
  };

  return (
    <>
      <Flex as="header" mb="8" align={{ base: "start", md: "end" }} justify="space-between" gap="4" flexDir={{ base: "column", md: "row" }}>
        <Box>
          <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Messaging</Text>
          <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Email templates</Text>
          <Text mt="2" fontSize="sm" color="gray.500">Manage subjects, HTML bodies, and replacement parameters used by system emails.</Text>
        </Box>
        <Button bg="green.600" color="white" _hover={{ bg: "green.700" }} onClick={() => openForm()}>Add template</Button>
      </Flex>

      {(error || message) && <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"}>{error || message}</Box>}

      <Box overflowX="auto" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white">
        <Table.Root minW="760px" size="sm">
          <Table.Header bg="gray.50"><Table.Row><Table.ColumnHeader px="5" py="3">Name</Table.ColumnHeader><Table.ColumnHeader px="5" py="3">Subject</Table.ColumnHeader><Table.ColumnHeader px="5" py="3">Parameters</Table.ColumnHeader><Table.ColumnHeader px="5" py="3" textAlign="right">Actions</Table.ColumnHeader></Table.Row></Table.Header>
          <Table.Body>
            {templates.map((template) => <Table.Row key={template.id}>
              <Table.Cell px="5" py="4" fontWeight="semibold">{template.name}</Table.Cell>
              <Table.Cell px="5" py="4">{template.title}</Table.Cell>
              <Table.Cell px="5" py="4" color="gray.500">{template.parameters?.map((parameter) => `{{${parameter.name}}}`).join(", ") || "None"}</Table.Cell>
              <Table.Cell px="5" py="4"><Flex justify="flex-end" gap="2"><Button size="sm" onClick={() => openForm(template)}>Edit</Button><Button size="sm" variant="outline" colorPalette="red" onClick={() => setDeleteTemplate(template)}>Delete</Button></Flex></Table.Cell>
            </Table.Row>)}
            {!templates.length && <Table.Row><Table.Cell colSpan={4} px="5" py="10" textAlign="center" color="gray.500">No email templates configured.</Table.Cell></Table.Row>}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root open={editing !== undefined} onOpenChange={(details) => !details.open && setEditing(undefined)}>
        <Portal><Dialog.Backdrop bg="blackAlpha.600" /><Dialog.Positioner><Dialog.Content as="form" onSubmit={save} maxW="2xl" borderRadius="2xl" p="6">
          <Dialog.Title fontSize="lg" fontWeight="bold">{editing ? "Edit email template" : "Add email template"}</Dialog.Title>
          <Dialog.Description mt="1" color="gray.500">Use placeholders such as {"{{full name}}"} in the subject or HTML body.</Dialog.Description>
          <Box mt="5"><Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Name</Text><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="password-reset" /></Box>
          <Box mt="4"><Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Subject</Text><Input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Reset your JobPilot password" /></Box>
          <Box mt="4"><Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Email body</Text><RichTextEditor value={form.body} onChange={(body) => setForm((current) => ({ ...current, body }))} /></Box>
          <Box mt="4"><Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Parameters (JSON array)</Text><Textarea minH="110px" fontFamily="mono" value={form.parameters} onChange={(event) => setForm((current) => ({ ...current, parameters: event.target.value }))} placeholder={'[{"name":"full name"},{"name":"link"}]'} /></Box>
          <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" loading={saving} bg="green.600" color="white" _hover={{ bg: "green.700" }}>Save template</Button></Flex>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(deleteTemplate)} onOpenChange={(details) => !details.open && setDeleteTemplate(null)}>
        <Portal><Dialog.Backdrop bg="blackAlpha.600" /><Dialog.Positioner><Dialog.Content maxW="md" borderRadius="2xl" p="6"><Dialog.Title fontSize="lg" fontWeight="bold">Delete email template?</Dialog.Title><Dialog.Description mt="2" color="gray.500">This will permanently remove {deleteTemplate?.name}.</Dialog.Description><Flex mt="6" justify="flex-end" gap="3"><Button variant="outline" onClick={() => setDeleteTemplate(null)}>Cancel</Button><Button colorPalette="red" onClick={remove}>Delete</Button></Flex></Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>
    </>
  );
}
