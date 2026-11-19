import { useEffect, useState } from "react";
import { Badge, Box, Button, Flex, Text } from "@chakra-ui/react";
import { api } from "../../../api";
import type { UserCustomPrompts as CustomPrompts } from "../../../types";

/** The client's own prompt rules from Account > Applications. Each replaces the default rules for
 * every profile of theirs; when one isn't set the default is used. */
export function UserCustomPrompts({ userId }: { userId: number }) {
  const [data, setData] = useState<CustomPrompts | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.userCustomPrompts(userId).then((result) => { if (active) setData(result); })
      .catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : "Unable to load custom prompts"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, revision]);
  const prompts = data ? [
    { label: "Resume tailoring rules", value: data.resumeTailorRules, hint: data.resumeTailorRules && data.resumeTailorRulesTokens !== null ? `${data.resumeTailorRulesTokens.toLocaleString()} tokens` : null },
    { label: "Cover letter rules", value: data.coverLetterRules, hint: null },
    { label: "Application answer rules", value: data.answerRules, hint: null },
  ] : [];
  return <Box bg="white" borderRadius="2xl" p="5" mt="6">
    <Flex justify="space-between" align="center" mb="4">
      <Box>
        <Text fontWeight="bold">Custom prompts</Text>
        <Text fontSize="xs" color="gray.500">The client's own rules, which replace the defaults for every profile of theirs</Text>
      </Box>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="3">{error}</Text>}
    {loading && !data && <Text role="status">Loading custom prompts...</Text>}
    {prompts.map(({ label, value, hint }) => <Box key={label} border="1px solid" borderColor="gray.200" borderRadius="lg" p="3" mb="3">
      <Flex gap="2" align="center" mb={value ? "2" : "0"}>
        <Text fontSize="sm" fontWeight="semibold">{label}</Text>
        <Badge colorPalette={value ? "green" : "gray"}>{value ? "Custom" : "Default"}</Badge>
        {hint && <Text fontSize="xs" color="gray.500">{hint}</Text>}
      </Flex>
      {value && <Box as="pre" fontSize="sm" whiteSpace="pre-wrap" overflowWrap="anywhere" maxH="320px" overflowY="auto" bg="gray.50" borderRadius="md" p="3" fontFamily="inherit">{value}</Box>}
    </Box>)}
  </Box>;
}
