import { useEffect, useState } from "react";
import { Badge, Box, Button, Flex, IconButton, Table, Text } from "@chakra-ui/react";
import { Pencil, Plus } from "lucide-react";
import { api } from "../../api";
import type { ApplicationSite } from "../../types";
import { ApplicationSiteFormModal } from "./components/ApplicationSiteFormModal";

export function ApplicationSitesPage() {
  const [sites, setSites] = useState<ApplicationSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState<"create" | ApplicationSite | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.applicationSites().then((result) => {
      if (!cancelled) setSites(result.applicationSites);
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load application sites");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  return (
    <>
      <Box as="header" mb="8">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Configuration</Text>
        <Text as="h1" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Application sites</Text>
        <Text mt="2" fontSize="sm" color="gray.500">Manage supported application sites and their automation settings.</Text>
      </Box>
      {modal && <ApplicationSiteFormModal site={modal === "create" ? undefined : modal} onClose={() => setModal(null)} onSaved={(saved) => {
        setSites((current) => [...current.filter((site) => site.id !== saved.id), saved].sort((a, b) => a.displayText.localeCompare(b.displayText)));
        setModal(null);
      }} />}
      {error && <Flex role="alert" mb="5" p="4" bg="red.50" color="red.700" borderRadius="xl" align="center" gap="3"><Text>{error}</Text><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Retry</Button></Flex>}
      <Box as="section" overflow="hidden" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" boxShadow="0 12px 35px rgba(24, 43, 34, .07)">
        <Flex p="5" justify="space-between" align="center" gap="3" flexWrap="wrap" borderBottom="1px solid" borderColor="gray.100">
          <Box><Text fontWeight="bold">Application sites</Text><Text fontSize="xs" color="gray.500">{sites.length} sites configured</Text></Box>
          <Button disabled={loading || !!error} onClick={() => setModal("create")} bg="green.600" color="white" _hover={{ bg: "green.700" }}><Plus size={16} />Add site</Button>
        </Flex>
        <Box overflowX="auto">
          <Table.Root minW="900px" size="sm">
            <Table.Header bg="gray.50"><Table.Row>{["Display text", "Type name", "Domain pattern", "Status", "Mode", "New context", "Input gap", "Actions"].map((label) => <Table.ColumnHeader key={label} px="4" py="3">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
            <Table.Body>
              {loading && <Table.Row><Table.Cell colSpan={8} p="8" textAlign="center">Loading application sites...</Table.Cell></Table.Row>}
              {!loading && !error && sites.length === 0 && <Table.Row><Table.Cell colSpan={8} p="8" textAlign="center" color="gray.500">No application sites configured yet. Add a site to get started.</Table.Cell></Table.Row>}
              {!loading && sites.map((site) => <Table.Row key={site.id} _hover={{ bg: "gray.50" }}>
                <Table.Cell px="4" py="4" fontWeight="semibold">{site.displayText}</Table.Cell>
                <Table.Cell px="4">{site.typeName}</Table.Cell>
                <Table.Cell px="4" maxW="xs" wordBreak="break-all" fontFamily="mono" fontSize="xs">{site.domainRegex}</Table.Cell>
                <Table.Cell px="4"><Badge colorPalette={site.active ? "green" : "gray"}>{site.active ? "Active" : "Inactive"}</Badge></Table.Cell>
                <Table.Cell px="4">{site.mode === "chrome-extension" ? "Chrome extension" : site.mode === "headed" ? "Headed" : "Headless"}</Table.Cell>
                <Table.Cell px="4">{site.newContextRequired ? "Yes" : "No"}</Table.Cell>
                <Table.Cell px="4" whiteSpace="nowrap">{site.fieldInputGapMs} ms</Table.Cell>
                <Table.Cell px="4"><IconButton aria-label={`Edit ${site.displayText}`} variant="ghost" size="sm" onClick={() => setModal(site)}><Pencil size={16} /></IconButton></Table.Cell>
              </Table.Row>)}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>
    </>
  );
}
