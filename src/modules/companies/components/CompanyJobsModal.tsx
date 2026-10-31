import { useEffect, useState } from "react";
import { Box, Dialog, Flex, IconButton, Portal, Text } from "@chakra-ui/react";
import { X } from "lucide-react";
import { api } from "../../../api";
import { PagePicker } from "../../../components/PagePicker";
import type { AdminCompany, CompanyJob, Pagination } from "../../../types";

/** The URLs of a company's jobs, newest first -- to identify a company stored without a name. */
export function CompanyJobsModal({ company, onClose }: { company: AdminCompany; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ jobs: CompanyJob[]; pagination: Pagination } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    api.companyJobs(company.id, page)
      .then((value) => { if (active) setResult(value); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load jobs"); });
    return () => { active = false; };
  }, [company.id, page]);

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="3xl" borderRadius="2xl" p="6">
            <Flex mb="4" align="start" justify="space-between" gap="4">
              <Box minW="0">
                <Dialog.Title fontSize="lg" fontWeight="bold">Jobs of {company.board}</Dialog.Title>
                <Text fontFamily="mono" fontSize="xs" color="gray.500" wordBreak="break-all">{company.tenant}</Text>
              </Box>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Close" size="sm" variant="ghost" color="gray.400" _hover={{ bg: "gray.100", color: "gray.600" }}>
                  <X size={18} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Flex>
            {error ? <Text color="red.600" fontSize="sm">{error}</Text>
              : !result ? <Text color="gray.400" fontSize="sm">Loading jobs…</Text>
              : !result.jobs.length ? <Text color="gray.400" fontSize="sm">No jobs linked to this company.</Text>
              : (
                <Box as="ul" listStyleType="none" m="0" p="0" maxH="60vh" overflowY="auto">
                  {result.jobs.map((job) => (
                    <Box as="li" key={job.id} py="2" borderTop="1px solid" borderColor="gray.100" fontSize="sm" wordBreak="break-all">
                      <a href={job.url} target="_blank" rel="noreferrer" style={{ color: "#2f855a" }}>{job.url}</a>
                    </Box>
                  ))}
                </Box>
              )}
            {result && result.pagination.totalPages > 1 && (
              <Flex mt="4" gap="2" align="center" justify="flex-end">
                <Text fontSize="xs" color="gray.500">{result.pagination.total} jobs · page {page} of {result.pagination.totalPages}</Text>
                <PagePicker page={page} totalPages={result.pagination.totalPages} onChange={setPage} />
              </Flex>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
