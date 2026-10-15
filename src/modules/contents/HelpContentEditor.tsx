import { useEffect, useState } from "react";
import { Box, Button, Flex, Text, Textarea } from "@chakra-ui/react";
import { api } from "../../api";
import type { FaqScope } from "../../types";

const previewStyle = `body{margin:0;padding:24px;color:#344054;font:15px/1.75 Inter,Arial,sans-serif}h2{margin:28px 0 10px;color:#17211b;font-size:20px}h3{margin:22px 0 8px;color:#315b49;font-size:16px}p{margin:10px 0}ul,ol{padding-left:24px}a{color:#1479a5}`;

export function HelpContentEditor() {
  const [scope, setScope] = useState<Exclude<FaqScope, null>>("public");
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.helpContent(scope).then((result) => { if (active) { setContent(result.content); setSavedContent(result.content); setUpdatedAt(result.updatedAt); } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load Help page content."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scope]);
  const dirty = content !== savedContent;
  const save = async () => {
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await api.updateHelpContent(scope, content);
      setContent(result.content); setSavedContent(result.content); setUpdatedAt(result.updatedAt);
      setMessage("Help page content saved and published.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save Help page content."); }
    finally { setSaving(false); }
  };
  const preview = `<!doctype html><html><head><meta charset="utf-8"><style>${previewStyle}</style></head><body>${content}</body></html>`;
  return (
    <>
      <Flex mb="5" align={{ base: "start", md: "end" }} justify="space-between" gap="4" flexDir={{ base: "column", md: "row" }}>
        <Box><Text as="h2" fontSize="xl" fontWeight="bold">Help page content</Text><Text mt="1" maxW="760px" fontSize="sm" color="gray.500">Edit the introductory content shown above the FAQs. Use an HTML fragment; FAQs are managed in the FAQ tab.</Text></Box>
        <Button colorPalette="green" onClick={() => void save()} loading={saving} disabled={loading || !dirty}>Save changes</Button>
      </Flex>
      {(error || message) && <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"} role={error ? "alert" : "status"}>{error || message}</Box>}
      <Box overflow="hidden" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white">
        <Flex px={{ base: "4", md: "6" }} pt="4" gap="2" role="tablist" aria-label="Help page audience">
          {(["public", "private"] as const).map((item) => <Button key={item} role="tab" aria-selected={scope === item} size="sm" variant={scope === item ? "solid" : "outline"} colorPalette={scope === item ? "green" : undefined} onClick={() => { if (dirty && !window.confirm("Discard unsaved Help page content?")) return; setScope(item); setMessage(""); }}>{item === "public" ? "Public Help" : "Private Help"}</Button>)}
        </Flex>
        <Flex align="center" justify="space-between" gap="3" borderBottom="1px solid" borderColor="gray.200" bg="gray.50" px={{ base: "4", md: "6" }} py="4" flexWrap="wrap">
          <Text fontWeight="semibold">{scope === "public" ? "Public Help page" : "Private Help page"}</Text><Text fontSize="xs" color="gray.500">{updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Not saved yet"}{dirty ? " · Unsaved changes" : ""}</Text>
        </Flex>
        {loading ? <Text p="8" textAlign="center" color="gray.500">Loading Help content…</Text> : (
          <Box p={{ base: "4", md: "6" }}>
            <Box display="grid" gridTemplateColumns={{ base: "1fr", xl: "minmax(0, 1fr) minmax(0, 1fr)" }} gap="5">
              <Box minW="0"><label htmlFor="help-html-editor" style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>HTML source</label><Textarea id="help-html-editor" value={content} onChange={(event) => { setContent(event.target.value); setMessage(""); }} minH={{ base: "360px", xl: "540px" }} resize="vertical" fontFamily="mono" fontSize="xs" lineHeight="1.65" spellCheck={false} /></Box>
              <Box minW="0"><Text mb="2" fontSize="sm" fontWeight="semibold">Preview</Text><Box overflow="hidden" minH={{ base: "360px", xl: "540px" }} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white"><iframe title="Help page content preview" srcDoc={preview} sandbox="" style={{ width: "100%", height: 540, border: 0 }} /></Box></Box>
            </Box>
            <Flex mt="5" justify="flex-end" gap="3"><Button variant="outline" disabled={!dirty || saving} onClick={() => { setContent(savedContent); setMessage(""); }}>Discard changes</Button><Button colorPalette="green" onClick={() => void save()} loading={saving} disabled={!dirty}>Save changes</Button></Flex>
          </Box>
        )}
      </Box>
    </>
  );
}
