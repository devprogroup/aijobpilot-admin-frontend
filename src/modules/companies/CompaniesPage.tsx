import { useEffect, useState } from "react";
import { Box, Button, Checkbox, Flex, IconButton, Image, Input, NativeSelect, Table, Text } from "@chakra-ui/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, companyLogoUrl } from "../../api";
import { PagePicker } from "../../components/PagePicker";
import { toaster } from "../../components/ui/toaster";
import type { AdminCompany, CompanyBoard } from "../../types";
import { CompanyFormModal } from "./components/CompanyFormModal";

const date = (value: string | null) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "—";

/** The companies table (one row per job board account: companies.tenant), with name / board /
 * without-name filters. Super and technical admins add, edit and delete them. */
export function CompaniesPage() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.companies>> | null>(null);
  const [boards, setBoards] = useState<CompanyBoard[]>([]);
  const [page, setPage] = useState(1);
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [board, setBoard] = useState("");
  const [unnamed, setUnnamed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminCompany | "new" | null>(null);

  useEffect(() => {
    api.companyBoards().then((value) => setBoards(value.boards)).catch(() => {});
  }, [revision]);

  // The name filter applies once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => { setName(nameInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [nameInput]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.companies(page, { name: name || undefined, board: board || undefined, unnamed })
      .then((value) => {
        if (!active) return;
        if (page > value.pagination.totalPages) { setPage(value.pagination.totalPages); return; }
        setResult(value);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load companies"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, name, board, unnamed, revision]);

  const remove = async (company: AdminCompany) => {
    const jobs = company.jobCount
      ? ` Its ${company.jobCount} job${company.jobCount === 1 ? "" : "s"} will stay but lose their company (logo, company page, same-company limit), and its board is no longer crawled.`
      : "";
    if (!window.confirm(`Delete ${company.name || "this unnamed company"} (${company.tenant})?${jobs} This cannot be undone.`)) return;
    try {
      const outcome = await api.deleteCompany(company.id);
      toaster.create({ title: "Company deleted.", description: outcome.jobsUnlinked ? `${outcome.jobsUnlinked} job(s) no longer have a company.` : undefined, type: "success" });
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete the company");
    }
  };

  const pages = result?.pagination.totalPages ?? 1;
  return <>
    {editing && (
      <CompanyFormModal
        company={editing === "new" ? undefined : editing}
        boards={boards}
        onClose={() => setEditing(null)}
        onSaved={(message) => { setEditing(null); toaster.create({ title: message, type: "success" }); setRevision((value) => value + 1); }}
      />
    )}
    <Flex as="header" justify="space-between" align="center" gap="4" mb="8" wrap="wrap">
      <Box>
        <Text as="h1" fontSize="3xl" fontWeight="bold">Companies</Text>
        <Text color="gray.500">Each company is one account on a job board. Its name, website and logo show on job cards; a profile's blacklist is matched against its name.</Text>
      </Box>
      <Flex gap="3">
        <Button bg="green.600" color="white" _hover={{ bg: "green.700" }} onClick={() => setEditing("new")}><Plus size={16} /> Add company</Button>
        <Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
      </Flex>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
    <Flex gap="3" mb="5" align="center" flexWrap="wrap">
      <Input maxW="72" bg="white" fontSize="sm" placeholder="Filter by name" value={nameInput} onChange={(event) => setNameInput(event.target.value)} />
      <NativeSelect.Root maxW="60" bg="white">
        <NativeSelect.Field value={board} onChange={(event) => { setBoard(event.target.value); setPage(1); }} fontSize="sm">
          <option value="">All boards</option>
          {boards.map((option) => <option key={option.board} value={option.board}>{option.board} ({option.companies})</option>)}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      <Checkbox.Root checked={unnamed} onCheckedChange={(details) => { setUnnamed(details.checked === true); setPage(1); }}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label fontSize="sm">Without name only</Checkbox.Label>
      </Checkbox.Root>
    </Flex>
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" overflow="hidden">
      <Box p="5"><Text fontWeight="bold">{loading ? "Loading..." : `${result?.pagination.total ?? 0} compan${result?.pagination.total === 1 ? "y" : "ies"}`}</Text><Text fontSize="xs" color="gray.500">Without a name first, then by name</Text></Box>
      <Box overflowX="auto"><Table.Root size="sm" minW="1100px">
        <Table.Header bg="gray.50"><Table.Row>{["Logo", "Name", "Board", "Board id", "Website", "Jobs", "Updated", ""].map((label, index) => <Table.ColumnHeader key={index} p="4">{label}</Table.ColumnHeader>)}</Table.Row></Table.Header>
        <Table.Body>
          {loading || error || !result?.companies.length
            ? <Table.Row><Table.Cell colSpan={8} p="8" textAlign="center">{loading ? "Loading companies..." : error ? "Unable to load companies. Use Refresh to retry." : "No companies match these filters."}</Table.Cell></Table.Row>
            : result.companies.map((company) => <Table.Row key={company.id} _hover={{ bg: "gray.50" }}>
              <Table.Cell p="3">{company.logo ? <Image src={companyLogoUrl(company.logo)!} alt="" h="8" maxW="20" objectFit="contain" /> : <Text color="gray.300">—</Text>}</Table.Cell>
              <Table.Cell p="4" fontWeight="semibold">{company.name || <Text as="span" color="orange.500" fontWeight="normal">No name</Text>}</Table.Cell>
              <Table.Cell p="4">{company.board}</Table.Cell>
              <Table.Cell p="4" fontFamily="mono" fontSize="xs" maxW="64" truncate title={company.boardId}>{company.boardId}</Table.Cell>
              <Table.Cell p="4" maxW="56" truncate>{company.url ? <a href={company.url} target="_blank" rel="noreferrer" style={{ color: "#2f855a" }}>{company.url}</a> : "—"}</Table.Cell>
              <Table.Cell p="4">{company.jobCount.toLocaleString()}</Table.Cell>
              <Table.Cell p="4" color="gray.500" whiteSpace="nowrap">{date(company.updatedAt)}</Table.Cell>
              <Table.Cell p="2" whiteSpace="nowrap">
                <IconButton aria-label={`Edit ${company.tenant}`} size="xs" variant="ghost" onClick={() => setEditing(company)}><Pencil size={14} /></IconButton>
                <IconButton aria-label={`Delete ${company.tenant}`} size="xs" variant="ghost" color="red.500" onClick={() => void remove(company)}><Trash2 size={14} /></IconButton>
              </Table.Cell>
            </Table.Row>)}
        </Table.Body>
      </Table.Root></Box>
      <Flex p="4" justify="space-between" align="center" gap="3" wrap="wrap"><Text fontSize="sm">Page {page} of {pages}</Text><Flex gap="2" align="center"><PagePicker page={page} totalPages={pages} onChange={setPage} disabled={loading || !!error} /><Button size="sm" variant="outline" disabled={loading || !!error || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={loading || !!error || page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></Flex></Flex>
    </Box>
  </>;
}
