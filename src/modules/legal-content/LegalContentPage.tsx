import { useEffect, useState } from "react";
import { Box, Button, Flex, Text, Textarea } from "@chakra-ui/react";
import { api } from "../../api";
import type { LegalDocument, LegalDocumentId } from "../../types";

const documentTabs: { id: LegalDocumentId; label: string }[] = [
  { id: "privacy", label: "Privacy Policy" },
  { id: "terms", label: "Terms of Service" },
];

const previewStyle = `
  body { margin: 0; padding: 24px; color: #344054; font: 15px/1.75 Inter, Arial, sans-serif; }
  h2 { margin: 28px 0 10px; color: #17211b; font-size: 20px; line-height: 1.3; }
  h3 { margin: 22px 0 8px; color: #315b49; font-size: 16px; }
  p { margin: 10px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 7px 0; }
  a { color: #1479a5; }
  code { overflow-wrap: anywhere; }
`;

export function LegalContentPage() {
  const [documents, setDocuments] = useState<Partial<Record<LegalDocumentId, LegalDocument>>>({});
  const [drafts, setDrafts] = useState<Partial<Record<LegalDocumentId, string>>>({});
  const [selectedId, setSelectedId] = useState<LegalDocumentId>("privacy");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.legalDocuments()
      .then(({ documents: result }) => {
        const byId = Object.fromEntries(result.map((document) => [document.id, document])) as Record<LegalDocumentId, LegalDocument>;
        setDocuments(byId);
        setDrafts(Object.fromEntries(result.map((document) => [document.id, document.content])));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load legal documents."))
      .finally(() => setLoading(false));
  }, []);

  const selectedDocument = documents[selectedId];
  const content = drafts[selectedId] ?? "";
  const dirty = selectedDocument ? content !== selectedDocument.content : false;

  const save = async () => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const { document } = await api.updateLegalDocument(selectedId, content);
      setDocuments((current) => ({ ...current, [selectedId]: document }));
      setDrafts((current) => ({ ...current, [selectedId]: document.content }));
      setMessage(`${document.title} saved. The public page now uses this content.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save legal document.");
    } finally {
      setSaving(false);
    }
  };

  const revert = () => {
    if (!selectedDocument) return;
    setDrafts((current) => ({ ...current, [selectedId]: selectedDocument.content }));
    setError("");
    setMessage("");
  };

  const previewDocument = `<!doctype html><html><head><meta charset="utf-8"><style>${previewStyle}</style></head><body>${content}</body></html>`;

  return (
    <>
      <Flex as="header" mb="7" align={{ base: "start", md: "end" }} justify="space-between" gap="4" flexDir={{ base: "column", md: "row" }}>
        <Box>
          <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Website</Text>
          <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Legal pages</Text>
          <Text mt="2" maxW="760px" fontSize="sm" color="gray.500">Edit the HTML served on the public Privacy Policy and Terms of Service pages.</Text>
        </Box>
        <Button colorPalette="green" onClick={() => void save()} loading={saving} disabled={loading || !selectedDocument || !dirty}>
          Save changes
        </Button>
      </Flex>

      {(error || message) && (
        <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"} role={error ? "alert" : "status"}>
          {error || message}
        </Box>
      )}

      <Box overflow="hidden" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white">
        <Flex align="center" justify="space-between" flexWrap="wrap" gap="3" borderBottom="1px solid" borderColor="gray.200" bg="gray.50" px={{ base: "4", md: "6" }} py="4">
          <Flex role="tablist" aria-label="Legal documents" gap="2" flexWrap="wrap">
            {documentTabs.map((tab) => (
              <Button
                key={tab.id}
                role="tab"
                aria-selected={selectedId === tab.id}
                size="sm"
                variant={selectedId === tab.id ? "solid" : "outline"}
                colorPalette={selectedId === tab.id ? "green" : undefined}
                onClick={() => { setSelectedId(tab.id); setError(""); setMessage(""); }}
              >
                {tab.label}
              </Button>
            ))}
          </Flex>
          <Text fontSize="xs" color="gray.500">
            {selectedDocument ? `Last saved ${new Date(selectedDocument.updatedAt).toLocaleString()}` : ""}
            {dirty ? " · Unsaved changes" : ""}
          </Text>
        </Flex>

        {loading ? (
          <Text p="8" textAlign="center" color="gray.500">Loading legal documents…</Text>
        ) : !selectedDocument ? (
          <Text p="8" textAlign="center" color="red.600">This legal document could not be found under FILES_ROOT/public/legal.</Text>
        ) : (
          <Box p={{ base: "4", md: "6" }}>
            <Text mb="4" fontSize="sm" color="gray.600">
              Edit the HTML source below. Saving updates the matching file in <Box as="code" px="1" borderRadius="sm" bg="gray.100" fontSize="xs">FILES_ROOT/public/legal/{selectedId}.html</Box> and the public page.
            </Text>
            <Box display="grid" gridTemplateColumns={{ base: "1fr", xl: "minmax(0, 1fr) minmax(0, 1fr)" }} gap="5">
              <Box minW="0">
                <label htmlFor="legal-html-editor" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>HTML source</label>
                <Textarea
                  id="legal-html-editor"
                  value={content}
                  onChange={(event) => { setDrafts((current) => ({ ...current, [selectedId]: event.target.value })); setMessage(""); }}
                  minH={{ base: "420px", xl: "620px" }}
                  resize="vertical"
                  fontFamily="mono"
                  fontSize="xs"
                  lineHeight="1.65"
                  spellCheck={false}
                  aria-label={`${selectedDocument.title} HTML source`}
                />
              </Box>
              <Box minW="0">
                <Text mb="2" fontSize="sm" fontWeight="semibold">Preview</Text>
                <Box overflow="hidden" minH={{ base: "420px", xl: "620px" }} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
                  <iframe title={`${selectedDocument.title} preview`} srcDoc={previewDocument} sandbox="" style={{ width: "100%", height: "620px", border: 0 }} />
                </Box>
              </Box>
            </Box>
            <Flex mt="5" justify="flex-end" gap="3">
              <Button variant="outline" onClick={revert} disabled={!dirty || saving}>Discard changes</Button>
              <Button colorPalette="green" onClick={() => void save()} loading={saving} disabled={!dirty}>Save changes</Button>
            </Flex>
          </Box>
        )}
      </Box>
    </>
  );
}
