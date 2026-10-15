import { useState } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { FileText, HelpCircle, MessagesSquare } from "lucide-react";
import { LegalContentPage } from "../legal-content/LegalContentPage";
import { FaqsContentPage } from "./FaqsContentPage";
import { HelpContentEditor } from "./HelpContentEditor";

const tabs = [
  { id: "legal", label: "Legal", icon: FileText },
  { id: "faqs", label: "FAQ", icon: HelpCircle },
  { id: "help", label: "Help", icon: MessagesSquare },
] as const;
type TabId = typeof tabs[number]["id"];

export function ContentManagementPage() {
  const [selected, setSelected] = useState<TabId>("legal");
  return (
    <>
      <Box mb="6">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Website</Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Contents</Text>
        <Text mt="2" maxW="760px" fontSize="sm" color="gray.500">Manage the public legal pages, frequently asked questions, and Help page content.</Text>
      </Box>
      <Flex role="tablist" aria-label="Website content types" gap="2" flexWrap="wrap" mb="6">
        {tabs.map(({ id, label, icon }) => (
          <Button key={id} role="tab" aria-selected={selected === id} variant={selected === id ? "solid" : "outline"} colorPalette={selected === id ? "green" : undefined} onClick={() => setSelected(id)}>
            <Box as={icon} aria-hidden="true" boxSize="4" />{label}
          </Button>
        ))}
      </Flex>
      {selected === "legal" && <LegalContentPage />}
      {selected === "faqs" && <FaqsContentPage />}
      {selected === "help" && <HelpContentEditor />}
    </>
  );
}
