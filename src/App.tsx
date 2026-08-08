import { useState } from "react";
import { Box, Icon, IconButton, Text } from "@chakra-ui/react";
import { Menu } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { CrawlerPage } from "./components/CrawlerPage";
import { CrawlerDetailsPage } from "./components/CrawlerDetailsPage";
import { CrawlerTypesPanel } from "./components/CrawlerTypesPanel";
import { UsersPage } from "./components/UsersPage";

function CrawlerTypesPage() {
  return (
    <>
      <Box as="header" mb="8">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Configuration</Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Crawler types</Text>
        <Text mt="2" fontSize="sm" color="gray.500">Manage crawler type definitions and defaults.</Text>
      </Box>
      <CrawlerTypesPanel />
    </>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <Box bg="#f5f7f4" color="#17211b" minH="100vh">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <Box as="main" minH="100vh" ml={{ base: 0, lg: "64" }}>
        <Box maxW="1440px" mx="auto" p={{ base: "5", sm: "8", lg: "10" }}>
          <IconButton
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            mb="5"
            display={{ base: "inline-flex", lg: "none" }}
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            bg="white"
            variant="outline"
          >
            <Icon as={Menu} />
          </IconButton>
          <Routes>
            <Route path="/crawlers/fleets" element={<CrawlerPage />} />
            <Route path="/crawlers/fleets/:crawlerId" element={<CrawlerDetailsPage />} />
            <Route path="/crawlers/types" element={<CrawlerTypesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="*" element={<Navigate to="/crawlers/fleets" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}
