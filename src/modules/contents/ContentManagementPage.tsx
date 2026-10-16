import { Box, Text } from "@chakra-ui/react";
import { Navigate, useParams } from "react-router-dom";
import { LegalContentPage } from "../legal-content/LegalContentPage";
import { FaqsContentPage } from "./FaqsContentPage";
import { HelpContentEditor } from "./HelpContentEditor";

export function ContentManagementPage() {
  const { section } = useParams<{ section: string }>();
  if (section !== "legal" && section !== "faqs" && section !== "help") {
    return <Navigate to="/contents/legal" replace />;
  }
  return (
    <>
      <Box mb="6">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Website</Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Contents</Text>
        <Text mt="2" maxW="760px" fontSize="sm" color="gray.500">Manage the public legal pages, frequently asked questions, and Help page content.</Text>
      </Box>
      {section === "faqs" ? <FaqsContentPage /> : section === "help" ? <HelpContentEditor /> : <LegalContentPage />}
    </>
  );
}
