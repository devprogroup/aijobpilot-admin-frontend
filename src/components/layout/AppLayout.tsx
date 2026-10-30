import { useCallback, useState } from "react";
import { Box, Icon, IconButton } from "@chakra-ui/react";
import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

const SIDEBAR_COLLAPSED_KEY = "jobpilot.adminSidebarCollapsed";

function readSidebarCollapsed() {
  try { return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"; } catch { return false; }
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const changeSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try { window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0"); } catch { /* Storage may be disabled. */ }
  }, []);

  return (
    <Box bg="#f5f7f4" color="#17211b" minH="100vh">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} collapsed={sidebarCollapsed} onCollapsedChange={changeSidebarCollapsed} />
      <Box as="main" minH="100vh" ml={{ base: 0, lg: sidebarCollapsed ? "16" : "64" }} transition="margin-left .2s">
        <Box p={{ base: "3", lg: "4" }}>
          <IconButton
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
            mb="3"
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
