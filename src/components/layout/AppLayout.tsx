import { useState } from "react";
import { Box, Icon, IconButton } from "@chakra-ui/react";
import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Box bg="#f5f7f4" color="#17211b" minH="100vh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box as="main" minH="100vh" ml={{ base: 0, lg: "64" }}>
        <Box maxW="1440px" mx="auto" p={{ base: "5", sm: "8", lg: "10" }}>
          <IconButton
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
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
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
