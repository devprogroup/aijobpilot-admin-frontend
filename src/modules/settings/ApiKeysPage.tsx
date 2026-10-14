import { useCallback, useEffect, useState } from "react";
import { Box, Button, Dialog, Flex, Input, Portal, Table, Text, Textarea } from "@chakra-ui/react";
import { api } from "../../api";
import type { ManagedApiKey } from "../../types";

const CREDENTIAL_LABELS: Record<string, string> = {
  DEEPSEEK_API_KEY: "DeepSeek",
  GEOAPIFY_API_KEY: "Geoapify",
  LLM_API_KEY: "LLM provider",
  OPENAI_ADMIN_KEY: "OpenAI admin",
  OPENAI_API_KEY: "OpenAI",
  RESEND_API_KEY: "Resend",
  TWOCAPTCHA_API_KEY: "2Captcha",
  TURNSTILE_SECRET_KEY: "Cloudflare Turnstile",
  GOOGLE_OAUTH_CREDENTIALS: "Google OAuth",
  OUTLOOK_OAUTH_CREDENTIALS: "Outlook OAuth",
};

const oauthCredentialKeys = new Set(["GOOGLE_OAUTH_CREDENTIALS", "OUTLOOK_OAUTH_CREDENTIALS"]);

export function ApiKeysPage() {
  const [credentials, setCredentials] = useState<ManagedApiKey[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const result = await api.apiKeys();
    setCredentials(result.apiKeys);
  }, []);

  useEffect(() => {
    load()
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load credentials."))
      .finally(() => setLoading(false));
  }, [load]);

  const openEditor = (key: string) => {
    setEditingKey(key);
    setIsAdding(false);
    setNewKey("");
    setDraft("");
    setError("");
  };

  const openAddDialog = () => {
    setEditingKey(null);
    setIsAdding(true);
    setNewKey("");
    setDraft("");
    setError("");
  };

  const closeEditor = () => {
    if (!saving) {
      setEditingKey(null);
      setIsAdding(false);
    }
  };

  const save = async () => {
    const key = isAdding ? newKey.trim() : editingKey;
    if (!draft.trim()) {
      window.alert("Value cannot be empty.");
      return;
    }
    if (!key) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      if (isAdding) await api.createApiKey(key, draft.trim());
      else await api.updateApiKey(key, draft.trim());
      await load();
      setEditingKey(null);
      setIsAdding(false);
      setDraft("");
      setNewKey("");
      setMessage(`${CREDENTIAL_LABELS[key] ?? key} ${isAdding ? "added" : "updated"}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update credential.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deletingKey) return;
    setError("");
    setMessage("");
    setDeleting(true);
    try {
      await api.deleteApiKey(deletingKey);
      await load();
      setMessage(`${CREDENTIAL_LABELS[deletingKey] ?? deletingKey} deleted.`);
      setDeletingKey(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete API key.");
    } finally {
      setDeleting(false);
    }
  };

  const activeKey = isAdding ? newKey.trim() : editingKey;
  const editingOAuthCredential = activeKey !== null && oauthCredentialKeys.has(activeKey);
  const canSave = !isAdding || Boolean(newKey.trim());

  return (
    <>
      <Flex as="header" mb="8" align="flex-end" justify="space-between" gap="4">
        <Box>
          <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">
            Configuration
          </Text>
          <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Credentials</Text>
        </Box>
        <Button colorPalette="green" onClick={openAddDialog}>Add API key</Button>
      </Flex>

      {(error || message) && (
        <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"}>
          {error || message}
        </Box>
      )}

      <Box overflowX="auto" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white">
        <Table.Root minW="720px" size="sm">
          <Table.Header bg="gray.50">
            <Table.Row>
              <Table.ColumnHeader p="4">Key name</Table.ColumnHeader>
              <Table.ColumnHeader p="4">Value</Table.ColumnHeader>
              <Table.ColumnHeader p="4">Updated</Table.ColumnHeader>
              <Table.ColumnHeader p="4" textAlign="right">Action</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading ? (
              <Table.Row><Table.Cell colSpan={4} p="8" textAlign="center" color="gray.500">Loading credentials...</Table.Cell></Table.Row>
            ) : credentials.length === 0 ? (
              <Table.Row><Table.Cell colSpan={4} p="8" textAlign="center" color="gray.500">No credentials configured.</Table.Cell></Table.Row>
            ) : credentials.map((credential) => (
              <Table.Row key={credential.key} _hover={{ bg: "gray.50" }}>
                <Table.Cell p="4">
                  <Text fontWeight="semibold">{CREDENTIAL_LABELS[credential.key] ?? credential.key}</Text>
                  <Text mt="1" fontSize="xs" color="gray.500" fontFamily="mono">{credential.key}</Text>
                </Table.Cell>
                <Table.Cell p="4" fontFamily="mono" color={credential.configured ? "gray.700" : "gray.400"}>
                  {credential.configured
                    ? oauthCredentialKeys.has(credential.key)
                      ? credential.displayValue || "Client ID not found"
                      : `****${credential.displayValue ?? ""}`
                    : "Not set"}
                </Table.Cell>
                <Table.Cell p="4" color="gray.600" whiteSpace="nowrap">
                  {credential.updatedAt ? new Date(credential.updatedAt).toLocaleString() : "-"}
                </Table.Cell>
                <Table.Cell p="4" textAlign="right">
                  <Flex justify="flex-end" gap="2">
                    <Button size="sm" variant="outline" onClick={() => openEditor(credential.key)}>Update</Button>
                    <Button size="sm" variant="outline" colorPalette="red" onClick={() => { setError(""); setDeletingKey(credential.key); }}>Delete</Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root open={isAdding || Boolean(editingKey)} onOpenChange={(details) => !details.open && closeEditor()}>
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.600" />
          <Dialog.Positioner>
            <Dialog.Content maxW={editingOAuthCredential ? "2xl" : "md"} borderRadius="2xl" p="6">
              <Dialog.Title fontSize="lg" fontWeight="bold">{isAdding ? "Add API key" : `Update ${editingKey ? CREDENTIAL_LABELS[editingKey] ?? editingKey : "credential"}`}</Dialog.Title>
              <Dialog.Description mt="2" color="gray.500">
                The saved value is masked in the table and cannot be retrieved from this page.
              </Dialog.Description>
              {error && <Box mt="4" borderRadius="lg" bg="red.50" p="3" fontSize="sm" color="red.700">{error}</Box>}
              {isAdding && (
                <Input
                  mt="5"
                  value={newKey}
                  onChange={(event) => setNewKey(event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "").replace(/^[^A-Z]+/, "").slice(0, 100))}
                  placeholder="API_KEY_NAME"
                  aria-label="API key name"
                />
              )}
              {editingOAuthCredential ? (
                <Textarea
                  mt={isAdding ? "3" : "5"}
                  minH="240px"
                  fontFamily="mono"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Paste OAuth client credentials JSON"
                  aria-label="OAuth client credentials JSON"
                />
              ) : (
                <Input
                  mt={isAdding ? "3" : "5"}
                  type="password"
                  autoComplete="new-password"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Enter credential value"
                  aria-label="Credential value"
                />
              )}
              <Flex mt="6" justify="flex-end" gap="3">
                <Button variant="outline" onClick={closeEditor} disabled={saving}>Cancel</Button>
                <Button colorPalette="green" onClick={() => void save()} disabled={!canSave || saving} loading={saving}>{isAdding ? "Add key" : "Update"}</Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(deletingKey)} onOpenChange={(details) => !details.open && !deleting && setDeletingKey(null)}>
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.600" />
          <Dialog.Positioner>
            <Dialog.Content maxW="md" borderRadius="2xl" p="6">
              <Dialog.Title fontSize="lg" fontWeight="bold">Delete credential?</Dialog.Title>
              <Dialog.Description mt="2" color="gray.600">This removes {deletingKey} from the credentials table.</Dialog.Description>
              <Box mt="4" borderRadius="lg" bg="orange.50" p="3" fontSize="sm" color="orange.800">
                Warning: deleting this credential may stop related API or OAuth integrations from working. This cannot be undone.
              </Box>
              {error && <Box mt="4" borderRadius="lg" bg="red.50" p="3" fontSize="sm" color="red.700">{error}</Box>}
              <Flex mt="6" justify="flex-end" gap="3">
                <Button variant="outline" onClick={() => setDeletingKey(null)} disabled={deleting}>Cancel</Button>
                <Button colorPalette="red" onClick={() => void remove()} disabled={deleting} loading={deleting}>Delete</Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
