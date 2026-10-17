import { Box, Text } from "@chakra-ui/react";
import { Navigate, useParams } from "react-router-dom";
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
        <Text mt="2" maxW="760px" fontSize="sm" color="gray.500">Legal pages are bundled with the client frontend. FAQs and Help content can be managed here.</Text>
      </Box>
      {section === "faqs" ? <FaqsContentPage /> : section === "help" ? <HelpContentEditor /> : (
        <Box border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p={{ base: "5", md: "7" }}>
          <Text fontSize="lg" fontWeight="semibold">Privacy Policy and Terms of Service</Text>
          <Text mt="2" maxW="760px" fontSize="sm" lineHeight="1.7" color="gray.600">
            These documents are embedded in the client frontend production build and do not depend on backend files. To update them, edit the HTML files in <Box as="code" px="1" borderRadius="sm" bg="gray.100" fontSize="xs">client-frontend/src/modules/legal/content</Box> and redeploy the client frontend.
          </Text>
        </Box>
      )}
    </>
  );
}
