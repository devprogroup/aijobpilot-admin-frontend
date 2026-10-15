import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  chakra,
  Collapsible,
  Flex,
  Icon,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  Bot,
  Activity,
  BarChart3,
  Boxes,
  Briefcase,
  CalendarClock,
  ChevronDown,
  List,
  ListTree,
  LogOut,
  Mail,
  Globe,
  KeyRound,
  FileText,
  Gift,
  SlidersHorizontal,
  PanelLeftClose,
  Sparkles,
  Settings,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const ChakraRouterLink = chakra(Link);

function ChildLink({
  to,
  icon,
  children,
  onClick,
}: {
  to: string;
  icon: typeof Boxes;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <NavLink to={to} onClick={onClick} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <Flex
          align="center"
          gap="2.5"
          borderRadius="lg"
          px="3"
          py="2.5"
          fontSize="sm"
          fontWeight="medium"
          transition="background .15s, color .15s"
          bg={isActive ? "white" : "transparent"}
          color={isActive ? "#17211b" : "whiteAlpha.700"}
          boxShadow={isActive ? "sm" : "none"}
          _hover={
            isActive ? undefined : { bg: "whiteAlpha.200", color: "white" }
          }
        >
          <Icon as={icon} boxSize="4" />
          {children}
        </Flex>
      )}
    </NavLink>
  );
}

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const crawlerActive = location.pathname.startsWith("/crawlers/");
  const applicationsActive = location.pathname.startsWith("/applications");
  const [applicationsOpen, setApplicationsOpen] = useState(applicationsActive);
  const usersActive = location.pathname.startsWith("/users") || location.pathname.startsWith("/admin-users");
  const [usersOpen, setUsersOpen] = useState(usersActive);
  const changePasswordActive = location.pathname === "/change-password";
  const dashboardActive = location.pathname.startsWith("/dashboard");
  const settingsActive = location.pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);
  const apiKeysActive = location.pathname.startsWith("/api-keys");
  const paymentsActive = location.pathname.startsWith("/wallets") || location.pathname.startsWith("/payments");
  const emailTemplatesActive = location.pathname.startsWith("/email-templates");
  const legalContentActive = location.pathname.startsWith("/contents") || location.pathname.startsWith("/legal-content");
  const messagesActive = location.pathname.startsWith("/messages");
  const maintenanceActive = location.pathname.startsWith("/maintenance");
  const [crawlersOpen, setCrawlersOpen] = useState(crawlerActive);

  useEffect(() => {
    if (crawlerActive) setCrawlersOpen(true);
  }, [crawlerActive]);

  useEffect(() => {
    if (applicationsActive) setApplicationsOpen(true);
  }, [applicationsActive]);

  useEffect(() => {
    if (usersActive) setUsersOpen(true);
  }, [usersActive]);

  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [settingsActive]);

  return (
    <>
      <chakra.button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        position="fixed"
        inset="0"
        zIndex="30"
        bg="blackAlpha.600"
        display={{ base: "block", lg: "none" }}
        opacity={open ? 1 : 0}
        pointerEvents={open ? "auto" : "none"}
        transition="opacity .15s"
      />

      <Box
        as="aside"
        aria-label="Primary navigation"
        position="fixed"
        insetY="0"
        left="0"
        zIndex="40"
        display="flex"
        flexDir="column"
        w="64"
        bg="#17211b"
        color="white"
        p="5"
        boxShadow={{ base: "xl", lg: "none" }}
        transform={{
          base: open ? "translateX(0)" : "translateX(-100%)",
          lg: "translateX(0)",
        }}
        transition="transform .2s"
      >
        <Flex align="center" justify="space-between" mb="8">
          <ChakraRouterLink
            to="/dashboard"
            onClick={onClose}
            display="flex"
            alignItems="center"
            gap="3"
          >
            <Flex
              h="10"
              w="10"
              align="center"
              justify="center"
              borderRadius="xl"
              bg="#b7e4c7"
              color="#19382b"
            >
              <Icon as={Sparkles} boxSize="5" />
            </Flex>
            <Box>
              <Text fontWeight="bold" letterSpacing="tight">
                JobPilot
              </Text>
              <Text fontSize="xs" color="whiteAlpha.500">
                Admin console
              </Text>
            </Box>
          </ChakraRouterLink>
          <IconButton
            aria-label="Close sidebar"
            onClick={onClose}
            display={{ base: "inline-flex", lg: "none" }}
            variant="ghost"
            color="whiteAlpha.700"
            _hover={{ bg: "whiteAlpha.200", color: "white" }}
          >
            <Icon as={PanelLeftClose} boxSize="5" />
          </IconButton>
        </Flex>

        <VStack align="stretch" gap="2">
          <NavLink to="/dashboard" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={dashboardActive ? "white" : "transparent"} color={dashboardActive ? "#17211b" : "whiteAlpha.700"} boxShadow={dashboardActive ? "sm" : "none"} _hover={dashboardActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Activity} boxSize="5" />
              Dashboard
            </Flex>
          </NavLink>
          <NavLink to="/maintenance" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={maintenanceActive ? "white" : "transparent"} color={maintenanceActive ? "#17211b" : "whiteAlpha.700"} boxShadow={maintenanceActive ? "sm" : "none"} _hover={maintenanceActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={CalendarClock} boxSize="5" />
              Maintenance
            </Flex>
          </NavLink>
          <Collapsible.Root
            open={crawlersOpen}
            onOpenChange={(details) => setCrawlersOpen(details.open)}
          >
            <Collapsible.Trigger asChild>
              <chakra.button
                type="button"
                w="full"
                display="flex"
                alignItems="center"
                gap="3"
                borderRadius="xl"
                px="4"
                py="3"
                fontSize="sm"
                fontWeight="semibold"
                color={crawlerActive ? "white" : "whiteAlpha.700"}
                _hover={{ bg: "whiteAlpha.200", color: "white" }}
              >
                <Icon as={Bot} boxSize="5" />
                <Text>Crawlers</Text>
                <Icon
                  as={ChevronDown}
                  boxSize="4"
                  ml="auto"
                  transform={crawlersOpen ? "rotate(180deg)" : undefined}
                  transition="transform .2s"
                />
              </chakra.button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <VStack
                align="stretch"
                gap="1"
                ml="5"
                pl="3"
                mt="1"
                borderLeft="1px solid"
                borderColor="whiteAlpha.200"
              >
                <ChildLink to="/crawlers/fleets" icon={Boxes} onClick={onClose}>
                  Crawler fleet
                </ChildLink>
                <ChildLink
                  to="/crawlers/types"
                  icon={ListTree}
                  onClick={onClose}
                >
                  Crawler types
                </ChildLink>
                <ChildLink to="/crawlers/crawled-jobs" icon={Briefcase} onClick={onClose}>
                  Crawled jobs
                </ChildLink>
                <ChildLink to="/crawlers/settings" icon={Settings} onClick={onClose}>
                  Crawler settings
                </ChildLink>
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>
          <Collapsible.Root open={applicationsOpen} onOpenChange={({ open }) => setApplicationsOpen(open)}>
            <Collapsible.Trigger asChild>
              <chakra.button type="button" w="full" display="flex" alignItems="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" color={applicationsActive ? "white" : "whiteAlpha.700"} _hover={{ bg: "whiteAlpha.200", color: "white" }}>
                <Icon as={Briefcase} boxSize="5" />
                <Text>Applications</Text>
                <Icon as={ChevronDown} boxSize="4" ml="auto" transform={applicationsOpen ? "rotate(180deg)" : undefined} transition="transform .2s" />
              </chakra.button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <VStack align="stretch" gap="1" ml="5" pl="3" mt="1" borderLeft="1px solid" borderColor="whiteAlpha.200">
                <ChildLink to="/applications/sites" icon={Globe} onClick={onClose}>
                  Application sites
                </ChildLink>
                <ChildLink to="/applications/all" icon={List} onClick={onClose}>
                  All applications
                </ChildLink>
                <ChildLink to="/applications/statistics" icon={BarChart3} onClick={onClose}>
                  Statistics
                </ChildLink>
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>

          <Collapsible.Root open={usersOpen} onOpenChange={(details) => setUsersOpen(details.open)}>
            <Collapsible.Trigger asChild>
              <chakra.button type="button" w="full" display="flex" alignItems="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" color={usersActive ? "white" : "whiteAlpha.700"} _hover={{ bg: "whiteAlpha.200", color: "white" }}>
                <Icon as={Users} boxSize="5" />
                <Text>Users</Text>
                <Icon as={ChevronDown} boxSize="4" ml="auto" transform={usersOpen ? "rotate(180deg)" : undefined} transition="transform .2s" />
              </chakra.button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <VStack align="stretch" gap="1" ml="5" pl="3" mt="1" borderLeft="1px solid" borderColor="whiteAlpha.200">
                <ChildLink to="/users/clients" icon={Users} onClick={onClose}>Clients</ChildLink>
                {user?.role === "super_admin" && <ChildLink to="/users/admins" icon={Shield} onClick={onClose}>Admins</ChildLink>}
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>
          {user?.role === "super_admin" && <NavLink to="/wallets" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={paymentsActive ? "white" : "transparent"} color={paymentsActive ? "#17211b" : "whiteAlpha.700"} boxShadow={paymentsActive ? "sm" : "none"} _hover={paymentsActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Wallet} boxSize="5" /> Wallets
            </Flex>
          </NavLink>}
          <Collapsible.Root open={settingsOpen} onOpenChange={(details) => setSettingsOpen(details.open)}>
            <Collapsible.Trigger asChild>
              <chakra.button type="button" w="full" display="flex" alignItems="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" color={settingsActive ? "white" : "whiteAlpha.700"} _hover={{ bg: "whiteAlpha.200", color: "white" }}>
                <Icon as={Settings} boxSize="5" />
                <Text>Settings</Text>
                <Icon as={ChevronDown} boxSize="4" ml="auto" transform={settingsOpen ? "rotate(180deg)" : undefined} transition="transform .2s" />
              </chakra.button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <VStack align="stretch" gap="1" ml="5" pl="3" mt="1" borderLeft="1px solid" borderColor="whiteAlpha.200">
                <ChildLink to="/settings/constants" icon={SlidersHorizontal} onClick={onClose}>Constants</ChildLink>
                <ChildLink to="/settings/bonus-plans" icon={Gift} onClick={onClose}>Bonus plans</ChildLink>
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>
          <NavLink to="/api-keys" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={apiKeysActive ? "white" : "transparent"} color={apiKeysActive ? "#17211b" : "whiteAlpha.700"} boxShadow={apiKeysActive ? "sm" : "none"} _hover={apiKeysActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={KeyRound} boxSize="5" />
              Credentials
            </Flex>
          </NavLink>
          <NavLink to="/email-templates" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={emailTemplatesActive ? "white" : "transparent"} color={emailTemplatesActive ? "#17211b" : "whiteAlpha.700"} boxShadow={emailTemplatesActive ? "sm" : "none"} _hover={emailTemplatesActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Mail} boxSize="5" />
              Email templates
            </Flex>
          </NavLink>
          <NavLink to="/contents" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={legalContentActive ? "white" : "transparent"} color={legalContentActive ? "#17211b" : "whiteAlpha.700"} boxShadow={legalContentActive ? "sm" : "none"} _hover={legalContentActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={FileText} boxSize="5" />
              Contents
            </Flex>
          </NavLink>
          <NavLink to="/messages" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={messagesActive ? "white" : "transparent"} color={messagesActive ? "#17211b" : "whiteAlpha.700"} boxShadow={messagesActive ? "sm" : "none"} _hover={messagesActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Mail} boxSize="5" />
              Messages
            </Flex>
          </NavLink>
        </VStack>

        <Box
          mt="auto"
          borderRadius="2xl"
          border="1px solid"
          borderColor="whiteAlpha.200"
          bg="whiteAlpha.100"
          p="4"
        >
          <Text mb="3" fontSize="xs" color="whiteAlpha.700" overflow="hidden" textOverflow="ellipsis">{user?.email}</Text>
          <Flex
            align="center"
            gap="2"
            mb="2"
            fontSize="xs"
            fontWeight="semibold"
          >
            <Box
              position="relative"
              h="2"
              w="2"
              borderRadius="full"
              bg="green.400"
              className="live-dot"
            />
            System online
          </Flex>
          <Text fontSize="xs" lineHeight="5" color="whiteAlpha.500">
            Crawler network is connected and reporting.
          </Text>
          <NavLink to="/change-password" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex mt="3" align="center" justify="center" gap="2" borderRadius="lg" px="3" py="2" fontSize="sm" fontWeight="semibold" bg={changePasswordActive ? "whiteAlpha.200" : "transparent"} color="whiteAlpha.800" _hover={{ bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={KeyRound} boxSize="4" /> Change password
            </Flex>
          </NavLink>
          <Button mt="3" size="sm" w="full" variant="ghost" color="whiteAlpha.700" _hover={{ bg: "whiteAlpha.200", color: "white" }} onClick={() => void logout()}>
            <Icon as={LogOut} boxSize="4" /> Sign out
          </Button>
        </Box>
      </Box>
    </>
  );
}
