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
  Building2,
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
  HelpCircle,
  SlidersHorizontal,
  PanelLeftClose,
  Sparkles,
  MessagesSquare,
  Inbox,
  Settings,
  ScrollText,
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
  end,
}: {
  to: string;
  icon: typeof Boxes;
  children: ReactNode;
  onClick: () => void;
  /** Active only on exactly this path, not on its sub-pages. */
  end?: boolean;
}) {
  return (
    <NavLink to={to} end={end} onClick={onClick} style={{ textDecoration: "none" }}>
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
  const hasPlatformAccess = user?.role === "technical" || user?.role === "super_admin";
  const crawlerActive = location.pathname.startsWith("/crawlers/");
  const applicationsActive = location.pathname.startsWith("/applications");
  const [applicationsOpen, setApplicationsOpen] = useState(applicationsActive);
  const usersActive = location.pathname.startsWith("/users") || location.pathname.startsWith("/admin-users");
  const [usersOpen, setUsersOpen] = useState(usersActive);
  const dashboardActive = location.pathname.startsWith("/dashboard");
  const contentsActive = location.pathname.startsWith("/contents");
  const settingsActive = location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/api-keys") ||
    location.pathname.startsWith("/email-templates") ||
    contentsActive;
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);
  const paymentsActive = location.pathname.startsWith("/wallets") || location.pathname.startsWith("/payments");
  const [contentsOpen, setContentsOpen] = useState(contentsActive);
  const messagesActive = location.pathname.startsWith("/messages");
  const maintenanceActive = location.pathname.startsWith("/maintenance");
  const logsActive = location.pathname.startsWith("/logs");
  const emailsActive = location.pathname.startsWith("/emails");
  const [crawlersOpen, setCrawlersOpen] = useState(crawlerActive);
  const companiesActive = location.pathname.startsWith("/companies");
  const [companiesOpen, setCompaniesOpen] = useState(companiesActive);
  const [emailsOpen, setEmailsOpen] = useState(emailsActive);

  useEffect(() => {
    if (crawlerActive) setCrawlersOpen(true);
  }, [crawlerActive]);

  useEffect(() => {
    if (emailsActive) setEmailsOpen(true);
  }, [emailsActive]);

  useEffect(() => {
    if (companiesActive) setCompaniesOpen(true);
  }, [companiesActive]);

  useEffect(() => {
    if (applicationsActive) setApplicationsOpen(true);
  }, [applicationsActive]);

  useEffect(() => {
    if (usersActive) setUsersOpen(true);
  }, [usersActive]);

  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [settingsActive]);

  useEffect(() => {
    if (contentsActive) setContentsOpen(true);
  }, [contentsActive]);

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

        <VStack align="stretch" gap="2" flex="1" minH="0" overflowY="auto">
          {user?.role === "support" ? (
            <NavLink to="/promo-codes" onClick={onClose} style={{ textDecoration: "none" }}>
              <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={location.pathname.startsWith("/promo-codes") ? "white" : "transparent"} color={location.pathname.startsWith("/promo-codes") ? "#17211b" : "whiteAlpha.700"} boxShadow={location.pathname.startsWith("/promo-codes") ? "sm" : "none"} _hover={{ bg: "whiteAlpha.200", color: "white" }}>
                <Icon as={Gift} boxSize="5" />
                Promo codes
              </Flex>
            </NavLink>
          ) : <>
          <NavLink to="/dashboard" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={dashboardActive ? "white" : "transparent"} color={dashboardActive ? "#17211b" : "whiteAlpha.700"} boxShadow={dashboardActive ? "sm" : "none"} _hover={dashboardActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Activity} boxSize="5" />
              Dashboard
            </Flex>
          </NavLink>
          {/* Every admin role uses promo codes (support admins get only this link, above). */}
          <NavLink to="/promo-codes" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={location.pathname.startsWith("/promo-codes") ? "white" : "transparent"} color={location.pathname.startsWith("/promo-codes") ? "#17211b" : "whiteAlpha.700"} boxShadow={location.pathname.startsWith("/promo-codes") ? "sm" : "none"} _hover={location.pathname.startsWith("/promo-codes") ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Gift} boxSize="5" />
              Promo codes
            </Flex>
          </NavLink>
          {hasPlatformAccess && <NavLink to="/maintenance" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={maintenanceActive ? "white" : "transparent"} color={maintenanceActive ? "#17211b" : "whiteAlpha.700"} boxShadow={maintenanceActive ? "sm" : "none"} _hover={maintenanceActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={CalendarClock} boxSize="5" />
              Maintenance
            </Flex>
          </NavLink>}
          {(user?.role === "technical" || user?.role === "super_admin") && <NavLink to="/logs" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={logsActive ? "white" : "transparent"} color={logsActive ? "#17211b" : "whiteAlpha.700"} boxShadow={logsActive ? "sm" : "none"} _hover={logsActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={ScrollText} boxSize="5" />
              Service logs
            </Flex>
          </NavLink>}
          {hasPlatformAccess && <Collapsible.Root open={emailsOpen} onOpenChange={(details) => setEmailsOpen(details.open)}>
            <Collapsible.Trigger asChild>
              <chakra.button type="button" w="full" display="flex" alignItems="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" color={emailsActive ? "white" : "whiteAlpha.700"} _hover={{ bg: "whiteAlpha.200", color: "white" }}>
                <Icon as={Inbox} boxSize="5" />
                <Text>Emails</Text>
                <Icon as={ChevronDown} boxSize="4" ml="auto" transform={emailsOpen ? "rotate(180deg)" : undefined} transition="transform .2s" />
              </chakra.button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <VStack align="stretch" gap="1" ml="5" pl="3" mt="1" borderLeft="1px solid" borderColor="whiteAlpha.200">
                <ChildLink to="/emails/admin" icon={Mail} onClick={onClose}>Admin Emails</ChildLink>
                <ChildLink to="/emails/inbound" icon={Inbox} onClick={onClose}>Inbound Emails</ChildLink>
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>}
          {hasPlatformAccess && <>
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
          <Collapsible.Root open={companiesOpen} onOpenChange={({ open }) => setCompaniesOpen(open)}>
            <Collapsible.Trigger asChild>
              <chakra.button type="button" w="full" display="flex" alignItems="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" color={companiesActive ? "white" : "whiteAlpha.700"} _hover={{ bg: "whiteAlpha.200", color: "white" }}>
                <Icon as={Building2} boxSize="5" />
                <Text>Companies</Text>
                <Icon as={ChevronDown} boxSize="4" ml="auto" transform={companiesOpen ? "rotate(180deg)" : undefined} transition="transform .2s" />
              </chakra.button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <VStack align="stretch" gap="1" ml="5" pl="3" mt="1" borderLeft="1px solid" borderColor="whiteAlpha.200">
                <ChildLink to="/companies" icon={Building2} onClick={onClose} end>
                  All companies
                </ChildLink>
                <ChildLink to="/companies/unknown" icon={HelpCircle} onClick={onClose}>
                  Unknown companies
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
          </>}

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
                {hasPlatformAccess && <ChildLink to="/users/admins" icon={Shield} onClick={onClose}>Admins</ChildLink>}
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>
          {user?.role === "super_admin" && <NavLink to="/wallets" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={paymentsActive ? "white" : "transparent"} color={paymentsActive ? "#17211b" : "whiteAlpha.700"} boxShadow={paymentsActive ? "sm" : "none"} _hover={paymentsActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Wallet} boxSize="5" /> Wallets
            </Flex>
          </NavLink>}
          {hasPlatformAccess && <Collapsible.Root open={settingsOpen} onOpenChange={(details) => setSettingsOpen(details.open)}>
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
                <ChildLink to="/api-keys" icon={KeyRound} onClick={onClose}>Credentials</ChildLink>
                <ChildLink to="/email-templates" icon={Mail} onClick={onClose}>Email templates</ChildLink>
                <Collapsible.Root open={contentsOpen} onOpenChange={(details) => setContentsOpen(details.open)}>
                  <Collapsible.Trigger asChild>
                    <chakra.button type="button" w="full" display="flex" alignItems="center" gap="2.5" borderRadius="lg" px="3" py="2.5" fontSize="sm" fontWeight="medium" color={contentsActive ? "white" : "whiteAlpha.700"} _hover={{ bg: "whiteAlpha.200", color: "white" }}>
                      <Icon as={FileText} boxSize="4" />
                      <Text>Contents</Text>
                      <Icon as={ChevronDown} boxSize="4" ml="auto" transform={contentsOpen ? "rotate(180deg)" : undefined} transition="transform .2s" />
                    </chakra.button>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <VStack align="stretch" gap="1" ml="4" pl="2" mt="1" borderLeft="1px solid" borderColor="whiteAlpha.200">
                      <ChildLink to="/contents/legal" icon={FileText} onClick={onClose}>Legal</ChildLink>
                      <ChildLink to="/contents/faqs" icon={HelpCircle} onClick={onClose}>FAQ</ChildLink>
                      <ChildLink to="/contents/help" icon={MessagesSquare} onClick={onClose}>Help</ChildLink>
                    </VStack>
                  </Collapsible.Content>
                </Collapsible.Root>
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>}
          <NavLink to="/messages" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={messagesActive ? "white" : "transparent"} color={messagesActive ? "#17211b" : "whiteAlpha.700"} boxShadow={messagesActive ? "sm" : "none"} _hover={messagesActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Mail} boxSize="5" />
              Messages
            </Flex>
          </NavLink>
          </>}
        </VStack>

        <Box
          mt="auto"
          borderRadius="2xl"
          border="1px solid"
          borderColor="whiteAlpha.200"
          bg="whiteAlpha.100"
          p="3"
        >
          <NavLink to={user?.role === "support" ? "/promo-codes" : "/account"} onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="1" py="1.5" bg={location.pathname.startsWith("/account") ? "whiteAlpha.100" : "transparent"} _hover={{ bg: "whiteAlpha.200" }} transition="background .15s, color .15s">
              <Flex h="10" w="10" flexShrink="0" align="center" justify="center" borderRadius="xl" bg="#b7e4c7" color="#19382b" fontSize="sm" fontWeight="bold" textTransform="uppercase">
                {user?.name?.trim().charAt(0) || user?.email.charAt(0) || "A"}
              </Flex>
              <Box minW="0" flex="1">
                <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontSize="sm" fontWeight="semibold" color="white">
                  {user?.name || user?.email || "Admin account"}
                </Text>
                <Flex mt="1" align="center" gap="1.5">
                  <Box h="1.5" w="1.5" flexShrink="0" borderRadius="full" bg={user?.status === "active" ? "green.300" : "orange.300"} />
                  <Text fontSize="xs" color="whiteAlpha.600" textTransform="capitalize">
                    {user?.role.replace("_", " ") || "Admin"}
                  </Text>
                </Flex>
              </Box>
            </Flex>
          </NavLink>
          <Box mt="2" pt="2" borderTop="1px solid" borderColor="whiteAlpha.200">
            <Button size="sm" w="full" justifyContent="flex-start" px="3" variant="ghost" color="whiteAlpha.700" _hover={{ bg: "red.500/15", color: "red.100" }} onClick={() => void logout()}>
              <Icon as={LogOut} boxSize="4" /> Sign out
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
}
