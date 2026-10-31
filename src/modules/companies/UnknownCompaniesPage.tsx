import { useEffect, useState } from "react";
import { Box, Button, Flex, IconButton, Image, NativeSelect, Text } from "@chakra-ui/react";
import { List, Pencil, Trash2 } from "lucide-react";
import { api, companyLogoUrl } from "../../api";
import { PagePicker } from "../../components/PagePicker";
import { toaster } from "../../components/ui/toaster";
import type { AdminCompany, CompanyBoard } from "../../types";
import { CompanyFormModal } from "./components/CompanyFormModal";
import { CompanyJobsModal } from "./components/CompanyJobsModal";

/** Companies stored without a name (the fetcher found none on the posting or board). Their jobs show
 * as "Unknown company" and are never matched by a blacklist; see a company's job URLs, then name it. */
export function UnknownCompaniesPage() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.companies>> | null>(null);
  const [boards, setBoards] = useState<CompanyBoard[]>([]);
  const [page, setPage] = useState(1);
  const [board, setBoard] = useState("");
  const [jobsOf, setJobsOf] = useState<AdminCompany | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminCompany | null>(null);

  useEffect(() => {
    api.companyBoards().then((value) => setBoards(value.boards)).catch(() => {});
  }, [revision]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.companies(page, { board: board || undefined, unnamed: true })
      .then((value) => {
        if (!active) return;
        if (page > value.pagination.totalPages) { setPage(value.pagination.totalPages); return; }
        setResult(value);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load companies"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, board, revision]);

  const remove = async (company: AdminCompany) => {
    if (!window.confirm(`Delete the unnamed company ${company.tenant}? Its ${company.jobCount} job(s) will stay but lose their company, and its board is no longer crawled. This cannot be undone.`)) return;
    try {
      await api.deleteCompany(company.id);
      toaster.create({ title: "Company deleted.", type: "success" });
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete the company");
    }
  };

  const pages = result?.pagination.totalPages ?? 1;
  const unnamedBoards = boards.filter((option) => option.unnamed > 0);
  return <>
    {jobsOf && <CompanyJobsModal company={jobsOf} onClose={() => setJobsOf(null)} />}
    {editing && (
      <CompanyFormModal
        company={editing}
        boards={boards}
        onClose={() => setEditing(null)}
        onSaved={(message) => { setEditing(null); toaster.create({ title: message, type: "success" }); setRevision((value) => value + 1); }}
      />
    )}
    <Flex as="header" justify="space-between" align="center" gap="4" mb="8" wrap="wrap">
      <Box>
        <Text as="h1" fontSize="3xl" fontWeight="bold">Unknown companies</Text>
        <Text color="gray.500">Companies without a name. Their jobs show as "Unknown company" and no blacklist matches them. Check a company's job URLs, then name it.</Text>
      </Box>
      <Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
    <Flex gap="3" mb="5">
      <NativeSelect.Root maxW="60" bg="white">
        <NativeSelect.Field value={board} onChange={(event) => { setBoard(event.target.value); setPage(1); }} fontSize="sm">
          <option value="">All boards</option>
          {unnamedBoards.map((option) => <option key={option.board} value={option.board}>{option.board} ({option.unnamed})</option>)}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Flex>
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" overflow="hidden">
      <Box p="5" borderBottom="1px solid" borderColor="gray.100"><Text fontWeight="bold">{loading ? "Loading..." : `${result?.pagination.total ?? 0} unnamed compan${result?.pagination.total === 1 ? "y" : "ies"}`}</Text></Box>
      {loading || error || !result?.companies.length
        ? <Text p="8" textAlign="center" color="gray.500">{loading ? "Loading companies..." : error ? "Unable to load companies. Use Refresh to retry." : "Every company has a name."}</Text>
        : result.companies.map((company) => (
          <Box key={company.id} borderBottom="1px solid" borderColor="gray.100">
            <Flex align="center" gap="3" px="4" py="3" _hover={{ bg: "gray.50" }}>
              {company.logo ? <Image src={companyLogoUrl(company.logo)!} alt="" h="7" maxW="16" objectFit="contain" /> : <Box w="16" />}
              <Box flex="1" minW="0">
                <Text fontWeight="semibold">{company.board}</Text>
                <Text fontFamily="mono" fontSize="xs" color="gray.500" truncate>{company.boardId}</Text>
              </Box>
              <Button size="xs" variant="outline" disabled={!company.jobCount} onClick={() => setJobsOf(company)}><List size={12} /> Jobs ({company.jobCount.toLocaleString()})</Button>
              <Button size="xs" variant="outline" onClick={() => setEditing(company)}><Pencil size={12} /> Name it</Button>
              <IconButton aria-label={`Delete ${company.tenant}`} size="xs" variant="ghost" color="red.500" onClick={() => void remove(company)}><Trash2 size={14} /></IconButton>
            </Flex>
          </Box>
        ))}
      <Flex p="4" justify="space-between" align="center" gap="3" wrap="wrap"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2" align="center"><PagePicker page={page} totalPages={pages} onChange={setPage} disabled={loading || !!error} /><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></Flex></Flex>
    </Box>
  </>;
}
