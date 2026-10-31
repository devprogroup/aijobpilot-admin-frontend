import { useState } from "react";
import { Box, Button, Dialog, Field, Flex, IconButton, Image, Input, Portal, Text } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { X } from "lucide-react";
import { api, companyLogoUrl } from "../../../api";
import type { AdminCompany, CompanyBoard } from "../../../types";

interface FormValues {
  board: string;
  boardId: string;
  name: string;
  url: string;
  logo: string;
}

const optionalUrl = (label: string) =>
  yup.string().trim().test("is-url", `${label} must be an http(s) URL`, (value) => {
    if (!value || value.startsWith("/imgs/")) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  });

/** Add a company, or edit one's name / website / logo. The board and its id (companies.tenant) are
 * set once: crawlers list the board by them and fetched jobs are filed under them. */
export function CompanyFormModal({
  company,
  boards,
  onClose,
  onSaved,
}: {
  company?: AdminCompany;
  boards: CompanyBoard[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [error, setError] = useState("");
  const editing = Boolean(company);
  const schema = yup.object({
    board: editing ? yup.string().default("") : yup.string().trim().required("Board is required").matches(/^[a-z0-9-]+$/, "Lowercase site name, e.g. greenhouse"),
    boardId: editing ? yup.string().default("") : yup.string().trim().required("Board id is required").matches(/^\S+$/, "No spaces"),
    name: yup.string().trim().max(255).default(""),
    url: optionalUrl("Website").default(""),
    logo: optionalUrl("Logo").default(""),
  });
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      board: company?.board ?? "",
      boardId: company?.boardId ?? "",
      name: company?.name ?? "",
      url: company?.url ?? "",
      logo: company?.logo ?? "",
    },
  });
  const logo = watch("logo")?.trim();
  const preview = logo ? (logo.startsWith("/imgs/") ? companyLogoUrl(logo) : logo) : null;

  const onSubmit = async (values: FormValues) => {
    setError("");
    const fields = { name: values.name.trim() || null, url: values.url.trim() || null, logo: values.logo.trim() || null };
    try {
      if (company) {
        const result = await api.updateCompany(company.id, fields);
        onSaved(result.jobsNamed
          ? `Saved. ${result.jobsNamed} job${result.jobsNamed === 1 ? "" : "s"} without a company name now show "${result.company.name}".`
          : "Company saved.");
      } else {
        await api.createCompany({ ...fields, board: values.board.trim(), boardId: values.boardId.trim() });
        onSaved("Company added.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the company");
    }
  };

  const label = (text: string) => <Field.Label fontSize="xs" fontWeight="semibold" color="gray.500">{text}</Field.Label>;

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg" borderRadius="2xl" p="6">
            <Flex mb="5" align="center" justify="space-between">
              <Dialog.Title fontSize="lg" fontWeight="bold">{company ? "Edit company" : "Add company"}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton aria-label="Close" size="sm" variant="ghost" color="gray.400" _hover={{ bg: "gray.100", color: "gray.600" }}>
                  <X size={18} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Flex>
            <Box as="form" onSubmit={handleSubmit(onSubmit)}>
              <Flex direction="column" gap="4">
                {company ? (
                  <Box borderRadius="xl" bg="gray.50" p="3" fontSize="sm">
                    <Text color="gray.500" fontSize="xs" fontWeight="semibold">Board</Text>
                    <Text fontFamily="mono" wordBreak="break-all">{company.tenant}</Text>
                  </Box>
                ) : (
                  <Flex gap="3">
                    <Field.Root invalid={!!errors.board} maxW="44">
                      {label("Board")}
                      <Input {...register("board")} list="company-boards" placeholder="greenhouse" borderColor="gray.200" fontSize="sm" />
                      <datalist id="company-boards">{boards.map((board) => <option key={board.board} value={board.board} />)}</datalist>
                      <Field.ErrorText>{errors.board?.message}</Field.ErrorText>
                    </Field.Root>
                    <Field.Root invalid={!!errors.boardId}>
                      {label("Board id")}
                      <Input {...register("boardId")} placeholder="the company's id on the board" borderColor="gray.200" fontSize="sm" />
                      <Field.ErrorText>{errors.boardId?.message}</Field.ErrorText>
                    </Field.Root>
                  </Flex>
                )}
                <Field.Root invalid={!!errors.name}>
                  {label("Name")}
                  <Input {...register("name")} borderColor="gray.200" fontSize="sm" />
                  <Field.HelperText fontSize="xs">Leave blank if unknown. A blank name is never matched by a profile's blacklist.</Field.HelperText>
                  <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
                </Field.Root>
                <Field.Root invalid={!!errors.url}>
                  {label("Website")}
                  <Input {...register("url")} placeholder="https://" borderColor="gray.200" fontSize="sm" />
                  <Field.ErrorText>{errors.url?.message}</Field.ErrorText>
                </Field.Root>
                <Field.Root invalid={!!errors.logo}>
                  {label("Logo")}
                  <Flex gap="3" align="center" w="full">
                    <Input {...register("logo")} placeholder="Image URL (downloaded when saved)" borderColor="gray.200" fontSize="sm" />
                    {preview && <Image src={preview} alt="" maxH="10" maxW="24" objectFit="contain" />}
                  </Flex>
                  <Field.ErrorText>{errors.logo?.message}</Field.ErrorText>
                </Field.Root>
                {error && <Box borderRadius="xl" bg="red.50" p="3" fontSize="sm" color="red.700">{error}</Box>}
                <Flex justify="flex-end" gap="3" pt="2">
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  <Button type="submit" bg="green.600" color="white" _hover={{ bg: "green.700" }} loading={isSubmitting}>
                    {company ? "Save" : "Add company"}
                  </Button>
                </Flex>
              </Flex>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
