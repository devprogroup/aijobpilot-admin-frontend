import { useEffect, useState } from "react";
import { Box, Button, Dialog, Flex, Input, Portal, Table, Text, Textarea } from "@chakra-ui/react";
import { api } from "../../api";
import type { EmailTemplate, EmailTemplatePayload } from "../../types";

const emptyForm = { name: "", fromName: "Job Pilot", fromEmailId: "no-reply", title: "", body: "", parameters: [] as Array<{ name: string; default?: string }> };

export function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null | undefined>(undefined);
  const [form, setForm] = useState(emptyForm);
  const [deleteTemplate, setDeleteTemplate] = useState<EmailTemplate | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [bodyMode, setBodyMode] = useState<"edit" | "preview">("edit");

  const load = async () => setTemplates((await api.emailTemplates()).emailTemplates);

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load email templates"));
  }, []);

  const openForm = (template?: EmailTemplate) => {
    setEditing(template ?? null);
    setForm(template ? {
      name: template.name,
      fromName: template.fromName,
      fromEmailId: template.fromEmailId,
      title: template.title,
      body: template.body,
      parameters: (template.parameters ?? []).map((parameter) => ({ ...parameter })),
    } : { ...emptyForm, parameters: [] });
    setBodyMode("edit");
    setError("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const payload: EmailTemplatePayload = {
        name: form.name.trim(),
        fromName: form.fromName.trim(),
        fromEmailId: form.fromEmailId.trim(),
        title: form.title.trim(),
        body: form.body.trim(),
        parameters: form.parameters.map((parameter) => ({
          name: parameter.name.trim(),
          ...(parameter.default?.trim() ? { default: parameter.default.trim() } : {}),
        })),
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
          <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Admin emails</Text>
          <Text mt="2" fontSize="sm" color="gray.500">Manage templates, subjects, HTML bodies, and replacement parameters used by system emails.</Text>
        </Box>
        <Button bg="green.600" color="white" _hover={{ bg: "green.700" }} onClick={() => openForm()}>Add template</Button>
      </Flex>

      {(error || message) && <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"}>{error || message}</Box>}

      <Box overflowX="auto" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white">
        <Table.Root minW="760px" size="sm">
          <Table.Header bg="gray.50"><Table.Row><Table.ColumnHeader px="5" py="3">Name</Table.ColumnHeader><Table.ColumnHeader px="5" py="3">From</Table.ColumnHeader><Table.ColumnHeader px="5" py="3">Subject</Table.ColumnHeader><Table.ColumnHeader px="5" py="3">Parameters</Table.ColumnHeader><Table.ColumnHeader px="5" py="3" textAlign="right">Actions</Table.ColumnHeader></Table.Row></Table.Header>
          <Table.Body>
            {templates.map((template) => <Table.Row key={template.id}>
              <Table.Cell px="5" py="4" fontWeight="semibold">{template.name}</Table.Cell>
              <Table.Cell px="5" py="4">{template.fromName} &lt;{template.fromEmailId}@aijobpilot.co&gt;</Table.Cell>
              <Table.Cell px="5" py="4">{template.title}</Table.Cell>
              <Table.Cell px="5" py="4" color="gray.500">{template.parameters?.map((parameter) => `{{${parameter.name}}}`).join(", ") || "None"}</Table.Cell>
              <Table.Cell px="5" py="4"><Flex justify="flex-end" gap="2"><Button size="sm" onClick={() => openForm(template)}>Edit</Button><Button size="sm" variant="outline" colorPalette="red" onClick={() => setDeleteTemplate(template)}>Delete</Button></Flex></Table.Cell>
            </Table.Row>)}
            {!templates.length && <Table.Row><Table.Cell colSpan={5} px="5" py="10" textAlign="center" color="gray.500">No email templates configured.</Table.Cell></Table.Row>}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root open={editing !== undefined} onOpenChange={(details) => !details.open && setEditing(undefined)}>
        <Portal><Dialog.Backdrop bg="blackAlpha.600" /><Dialog.Positioner><Dialog.Content as="form" onSubmit={save} maxW="2xl" borderRadius="2xl" p="6">
          <Dialog.Title fontSize="lg" fontWeight="bold">{editing ? "Edit email template" : "Add email template"}</Dialog.Title>
          <Dialog.Description mt="1" color="gray.500">Use placeholders such as {"{{full name}}"} in the subject or HTML body.</Dialog.Description>
          <Box mt="5"><Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Name</Text><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="password-reset" /></Box>
          <Flex mt="4" gap="3" align="end">
            <Box flex="1"><Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">From name</Text><Input required maxLength={100} value={form.fromName} onChange={(event) => setForm((current) => ({ ...current, fromName: event.target.value }))} placeholder="Job Pilot" /></Box>
            <Box flex="1"><Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">From email ID</Text><Flex align="center" gap="2"><Input required maxLength={64} value={form.fromEmailId} onChange={(event) => setForm((current) => ({ ...current, fromEmailId: event.target.value }))} placeholder="no-reply" /><Text whiteSpace="nowrap" color="gray.500">@aijobpilot.co</Text></Flex></Box>
          </Flex>
          <Box mt="4"><Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Subject</Text><Input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Reset your JobPilot password" /></Box>
          <Box mt="4">
            <Flex mb="2" align="center" justify="space-between">
              <Text fontSize="xs" fontWeight="semibold" color="gray.500">Email body</Text>
              <Flex gap="1" border="1px solid" borderColor="gray.200" borderRadius="md" p="1">
                <Button type="button" size="xs" variant={bodyMode === "edit" ? "solid" : "ghost"} colorPalette={bodyMode === "edit" ? "green" : undefined} onClick={() => setBodyMode("edit")}>Edit HTML</Button>
                <Button type="button" size="xs" variant={bodyMode === "preview" ? "solid" : "ghost"} colorPalette={bodyMode === "preview" ? "green" : undefined} onClick={() => setBodyMode("preview")}>Preview</Button>
              </Flex>
            </Flex>
            {bodyMode === "edit" ? (
              <Textarea
                required
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                minH="320px"
                resize="vertical"
                fontFamily="mono"
                fontSize="sm"
                spellCheck={false}
                placeholder={'<!doctype html>\n<html>\n  <body>\n    <p>Hello {{full name}},</p>\n  </body>\n</html>'}
              />
            ) : (
              <Box overflow="hidden" minH="320px" border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
                {form.body.trim() ? (
                  <iframe title="Email template preview" srcDoc={form.body} sandbox="" style={{ width: "100%", height: 320, border: 0 }} />
                ) : (
                  <Flex h="320px" align="center" justify="center"><Text color="gray.500">Enter HTML to preview the email.</Text></Flex>
                )}
              </Box>
            )}
          </Box>
          <Box mt="4">
            <Flex mb="2" align="center" justify="space-between"><Text fontSize="xs" fontWeight="semibold" color="gray.500">Parameters</Text><Button type="button" size="xs" variant="outline" onClick={() => setForm((current) => ({ ...current, parameters: [...current.parameters, { name: "", default: "" }] }))}>Add parameter</Button></Flex>
            <Flex mb="1" gap="2"><Text flex="1" fontSize="xs" color="gray.500">Name</Text><Text flex="1" fontSize="xs" color="gray.500">Default</Text><Box w="70px" /></Flex>
            {form.parameters.map((parameter, index) => <Flex key={index} mb="2" gap="2" align="center">
              <Input required flex="1" value={parameter.name} placeholder="full name" onChange={(event) => setForm((current) => ({ ...current, parameters: current.parameters.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} />
              <Input flex="1" value={parameter.default ?? ""} placeholder="Optional default" onChange={(event) => setForm((current) => ({ ...current, parameters: current.parameters.map((item, itemIndex) => itemIndex === index ? { ...item, default: event.target.value } : item) }))} />
              <Button type="button" w="70px" size="sm" variant="ghost" colorPalette="red" onClick={() => setForm((current) => ({ ...current, parameters: current.parameters.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</Button>
            </Flex>)}
            {!form.parameters.length && <Text border="1px dashed" borderColor="gray.200" borderRadius="md" p="3" fontSize="sm" color="gray.500">No parameters. Add one for each placeholder used in the subject or body.</Text>}
          </Box>
          <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" loading={saving} bg="green.600" color="white" _hover={{ bg: "green.700" }}>Save template</Button></Flex>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(deleteTemplate)} onOpenChange={(details) => !details.open && setDeleteTemplate(null)}>
        <Portal><Dialog.Backdrop bg="blackAlpha.600" /><Dialog.Positioner><Dialog.Content maxW="md" borderRadius="2xl" p="6"><Dialog.Title fontSize="lg" fontWeight="bold">Delete email template?</Dialog.Title><Dialog.Description mt="2" color="gray.500">This will permanently remove {deleteTemplate?.name}.</Dialog.Description><Flex mt="6" justify="flex-end" gap="3"><Button variant="outline" onClick={() => setDeleteTemplate(null)}>Cancel</Button><Button colorPalette="red" onClick={remove}>Delete</Button></Flex></Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>
    </>
  );
}
