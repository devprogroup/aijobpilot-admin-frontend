import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  chakra,
  Collapsible,
  Flex,
  HoverCard,
  Icon,
  IconButton,
  Portal,
  Text,
  useBreakpointValue,
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
  PanelLeftOpen,
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

/** collapsed: the desktop icon rail; onClose closes the mobile drawer; onExpand leaves the rail. */
const SidebarContext = createContext({ collapsed: false, onClose: () => {}, onExpand: () => {} });

function ChildLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: typeof Boxes;
  children: ReactNode;
}) {
  const { onClose } = useContext(SidebarContext);
  return (
    <NavLink to={to} onClick={onClose} style={{ textDecoration: "none" }}>
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

function NavItem({ to, icon, active, children }: { to: string; icon: typeof Boxes; active: boolean; children: string }) {
  const { collapsed, onClose } = useContext(SidebarContext);
  return (
    <NavLink to={to} onClick={onClose} aria-label={children} title={collapsed ? children : undefined} style={{ textDecoration: "none" }}>
      <Flex align="center" justify={collapsed ? "center" : undefined} gap="3" borderRadius="xl" px={collapsed ? "0" : "4"} py={collapsed ? "2.5" : "3"} fontSize="sm" fontWeight="semibold" bg={active ? "white" : "transparent"} color={active ? "#17211b" : "whiteAlpha.700"} boxShadow={active ? "sm" : "none"} _hover={active ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
        <Icon as={icon} boxSize="5" />
        {!collapsed && children}
      </Flex>
    </NavLink>
  );
}

/** A menu group: expandable in the full sidebar; on the rail its links fly out on hover, and a
 * click (the only option on touch screens) opens the full sidebar on this group. */
function NavGroup({ icon, label, active, open, onOpenChange, nested, children }: {
  icon: typeof Boxes;
  label: string;
  active: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
  children: ReactNode;
}) {
  const sidebar = useContext(SidebarContext);
  const expanded = useMemo(() => ({ ...sidebar, collapsed: false }), [sidebar]);
  if (sidebar.collapsed) return (
    <HoverCard.Root lazyMount unmountOnExit openDelay={80} closeDelay={150} positioning={{ placement: "right-start", gutter: 14 }}>
      <HoverCard.Trigger asChild>
        <chakra.button type="button" aria-label={label} w="full" display="flex" alignItems="center" justifyContent="center" borderRadius="xl" py="2.5" bg={active ? "white" : "transparent"} color={active ? "#17211b" : "whiteAlpha.700"} boxShadow={active ? "sm" : "none"} _hover={active ? undefined : { bg: "whiteAlpha.200", color: "white" }} onClick={() => { onOpenChange(true); sidebar.onExpand(); }}>
          <Icon as={icon} boxSize="5" />
        </chakra.button>
      </HoverCard.Trigger>
      <Portal><HoverCard.Positioner><HoverCard.Content w="60" maxH="85vh" overflowY="auto" p="2" bg="#17211b" color="white" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200" boxShadow="xl">
        <Text px="3" pt="1" pb="2" fontSize="xs" fontWeight="semibold" color="whiteAlpha.600">{label}</Text>
        <SidebarContext.Provider value={expanded}><VStack align="stretch" gap="1">{children}</VStack></SidebarContext.Provider>
      </HoverCard.Content></HoverCard.Positioner></Portal>
    </HoverCard.Root>
  );
  return (
    <Collapsible.Root open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      <Collapsible.Trigger asChild>
        <chakra.button type="button" w="full" display="flex" alignItems="center" gap={nested ? "2.5" : "3"} borderRadius={nested ? "lg" : "xl"} px={nested ? "3" : "4"} py={nested ? "2.5" : "3"} fontSize="sm" fontWeight={nested ? "medium" : "semibold"} color={active ? "white" : "whiteAlpha.700"} _hover={{ bg: "whiteAlpha.200", color: "white" }}>
          <Icon as={icon} boxSize={nested ? "4" : "5"} />
          <Text>{label}</Text>
          <Icon as={ChevronDown} boxSize="4" ml="auto" transform={open ? "rotate(180deg)" : undefined} transition="transform .2s" />
        </chakra.button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <VStack align="stretch" gap="1" ml={nested ? "4" : "5"} pl={nested ? "2" : "3"} mt="1" borderLeft="1px solid" borderColor="whiteAlpha.200">
          {children}
        </VStack>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export function Sidebar({
  open,
  onClose,
  collapsed: collapsedSetting,
  onCollapsedChange,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const location = useLocation();
  const { user, logout } = useAuth();
  // The rail is desktop only: the mobile drawer always shows the full menu.
  const isDesktop = useBreakpointValue({ base: false, lg: true }, { ssr: false });
  const collapsed = collapsedSetting && !!isDesktop;
  const context = useMemo(() => ({ collapsed, onClose, onExpand: () => onCollapsedChange(false) }), [collapsed, onClose, onCollapsedChange]);
  const hasPlatformAccess = user?.role === "technical" || user?.role === "super_admin";
  const crawlerActive = location.pathname.startsWith("/crawlers/");
  const applicationsActive = location.pathname.startsWith("/applications");
  const [applicationsOpen, setApplicationsOpen] = useState(applicationsActive);
  const usersActive = location.pathname.startsWith("/users") || location.pathname.startsWith("/admin-users");
  const [usersOpen, setUsersOpen] = useState(usersActive);
  const dashboardActive = location.pathname.startsWith("/dashboard");
  const promoCodesActive = location.pathname.startsWith("/promo-codes");
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
  const [emailsOpen, setEmailsOpen] = useState(emailsActive);

  useEffect(() => {
    if (crawlerActive) setCrawlersOpen(true);
  }, [crawlerActive]);

  useEffect(() => {
    if (emailsActive) setEmailsOpen(true);
  }, [emailsActive]);


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
    <SidebarContext.Provider value={context}>
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
        w={collapsed ? "16" : "64"}
        bg="#17211b"
        color="white"
        p={collapsed ? "3" : "5"}
        boxShadow={{ base: "xl", lg: "none" }}
        transform={{
          base: open ? "translateX(0)" : "translateX(-100%)",
          lg: "translateX(0)",
        }}
        transition="transform .2s, width .2s"
      >
        <Flex align="center" justify={collapsed ? "center" : "space-between"} direction={collapsed ? "column" : "row"} gap={collapsed ? "2" : "0"} mb={collapsed ? "4" : "8"}>
          <ChakraRouterLink
            to="/dashboard"
            onClick={onClose}
            display="flex"
            alignItems="center"
            gap="3"
            aria-label="JobPilot dashboard"
          >
            <Flex
              h="10"
              w="10"
              flexShrink="0"
              align="center"
              justify="center"
              borderRadius="xl"
              bg="#b7e4c7"
              color="#19382b"
            >
              <Icon as={Sparkles} boxSize="5" />
            </Flex>
            {!collapsed && <Box>
              <Text fontWeight="bold" letterSpacing="tight">
                JobPilot
              </Text>
              <Text fontSize="xs" color="whiteAlpha.500">
                Admin console
              </Text>
            </Box>}
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
          <IconButton
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => onCollapsedChange(!collapsed)}
            display={{ base: "none", lg: "inline-flex" }}
            size="sm"
            variant="ghost"
            color="whiteAlpha.700"
            _hover={{ bg: "whiteAlpha.200", color: "white" }}
          >
            <Icon as={collapsed ? PanelLeftOpen : PanelLeftClose} boxSize="5" />
          </IconButton>
        </Flex>

        <VStack align="stretch" gap={collapsed ? "1" : "2"} flex="1" minH="0" overflowY="auto" overflowX="hidden">
          {user?.role === "support" ? (
            <NavItem to="/promo-codes" icon={Gift} active={promoCodesActive}>Promo codes</NavItem>
          ) : <>
          <NavItem to="/dashboard" icon={Activity} active={dashboardActive}>Dashboard</NavItem>
          {/* Every admin role uses promo codes (support admins get only this link, above). */}
          <NavItem to="/promo-codes" icon={Gift} active={promoCodesActive}>Promo codes</NavItem>
          {hasPlatformAccess && <NavItem to="/maintenance" icon={CalendarClock} active={maintenanceActive}>Maintenance</NavItem>}
          {hasPlatformAccess && <NavItem to="/logs" icon={ScrollText} active={logsActive}>Service logs</NavItem>}
          {hasPlatformAccess && <NavGroup icon={Inbox} label="Emails" active={emailsActive} open={emailsOpen} onOpenChange={setEmailsOpen}>
            <ChildLink to="/emails/admin" icon={Mail}>Admin Emails</ChildLink>
            <ChildLink to="/emails/inbound" icon={Inbox}>Inbound Emails</ChildLink>
          </NavGroup>}
          {hasPlatformAccess && <>
          <NavGroup icon={Bot} label="Crawlers" active={crawlerActive} open={crawlersOpen} onOpenChange={setCrawlersOpen}>
            <ChildLink to="/crawlers/fleets" icon={Boxes}>Crawler fleet</ChildLink>
            <ChildLink to="/crawlers/types" icon={ListTree}>Crawler types</ChildLink>
            <ChildLink to="/crawlers/crawled-jobs" icon={Briefcase}>Crawled jobs</ChildLink>
            <ChildLink to="/crawlers/settings" icon={Settings}>Crawler settings</ChildLink>
          </NavGroup>
          <NavItem to="/companies" icon={Building2} active={companiesActive}>Companies</NavItem>
          <NavGroup icon={Briefcase} label="Applications" active={applicationsActive} open={applicationsOpen} onOpenChange={setApplicationsOpen}>
            <ChildLink to="/applications/sites" icon={Globe}>Application sites</ChildLink>
            <ChildLink to="/applications/all" icon={List}>All applications</ChildLink>
            <ChildLink to="/applications/statistics" icon={BarChart3}>Statistics</ChildLink>
          </NavGroup>
          </>}

          <NavGroup icon={Users} label="Users" active={usersActive} open={usersOpen} onOpenChange={setUsersOpen}>
            <ChildLink to="/users/clients" icon={Users}>Clients</ChildLink>
            {hasPlatformAccess && <ChildLink to="/users/admins" icon={Shield}>Admins</ChildLink>}
          </NavGroup>
          {user?.role === "super_admin" && <NavItem to="/wallets" icon={Wallet} active={paymentsActive}>Wallets</NavItem>}
          {hasPlatformAccess && <NavGroup icon={Settings} label="Settings" active={settingsActive} open={settingsOpen} onOpenChange={setSettingsOpen}>
            <ChildLink to="/settings/constants" icon={SlidersHorizontal}>Constants</ChildLink>
            <ChildLink to="/settings/models" icon={Sparkles}>Models</ChildLink>
            <ChildLink to="/settings/bonus-plans" icon={Gift}>Bonus plans</ChildLink>
            <ChildLink to="/api-keys" icon={KeyRound}>Credentials</ChildLink>
            <ChildLink to="/email-templates" icon={Mail}>Email templates</ChildLink>
            <NavGroup nested icon={FileText} label="Contents" active={contentsActive} open={contentsOpen} onOpenChange={setContentsOpen}>
              <ChildLink to="/contents/legal" icon={FileText}>Legal</ChildLink>
              <ChildLink to="/contents/faqs" icon={HelpCircle}>FAQ</ChildLink>
              <ChildLink to="/contents/help" icon={MessagesSquare}>Help</ChildLink>
            </NavGroup>
          </NavGroup>}
          <NavItem to="/messages" icon={Mail} active={messagesActive}>Messages</NavItem>
          </>}
        </VStack>

        <Box
          mt="auto"
          borderRadius={collapsed ? "xl" : "2xl"}
          border={collapsed ? undefined : "1px solid"}
          borderColor="whiteAlpha.200"
          bg={collapsed ? undefined : "whiteAlpha.100"}
          p={collapsed ? "0" : "3"}
          pt={collapsed ? "3" : undefined}
        >
          <NavLink to={user?.role === "support" ? "/promo-codes" : "/account"} onClick={onClose} aria-label="Account" title={collapsed ? user?.name || user?.email || "Admin account" : undefined} style={{ textDecoration: "none" }}>
            <Flex align="center" justify={collapsed ? "center" : undefined} gap="3" borderRadius="xl" px={collapsed ? "0" : "1"} py={collapsed ? "0" : "1.5"} bg={location.pathname.startsWith("/account") ? "whiteAlpha.100" : "transparent"} _hover={{ bg: "whiteAlpha.200" }} transition="background .15s, color .15s">
              <Flex h="10" w="10" flexShrink="0" align="center" justify="center" borderRadius="xl" bg="#b7e4c7" color="#19382b" fontSize="sm" fontWeight="bold" textTransform="uppercase">
                {user?.name?.trim().charAt(0) || user?.email.charAt(0) || "A"}
              </Flex>
              {!collapsed && <Box minW="0" flex="1">
                <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontSize="sm" fontWeight="semibold" color="white">
                  {user?.name || user?.email || "Admin account"}
                </Text>
                <Flex mt="1" align="center" gap="1.5">
                  <Box h="1.5" w="1.5" flexShrink="0" borderRadius="full" bg={user?.status === "active" ? "green.300" : "orange.300"} />
                  <Text fontSize="xs" color="whiteAlpha.600" textTransform="capitalize">
                    {user?.role.replace("_", " ") || "Admin"}
                  </Text>
                </Flex>
              </Box>}
            </Flex>
          </NavLink>
          <Box mt="2" pt="2" borderTop="1px solid" borderColor="whiteAlpha.200">
            {collapsed
              ? <IconButton aria-label="Sign out" title="Sign out" size="sm" w="full" variant="ghost" color="whiteAlpha.700" _hover={{ bg: "red.500/15", color: "red.100" }} onClick={() => void logout()}><Icon as={LogOut} boxSize="4" /></IconButton>
              : <Button size="sm" w="full" justifyContent="flex-start" px="3" variant="ghost" color="whiteAlpha.700" _hover={{ bg: "red.500/15", color: "red.100" }} onClick={() => void logout()}>
                  <Icon as={LogOut} boxSize="4" /> Sign out
                </Button>}
          </Box>
        </Box>
      </Box>
    </SidebarContext.Provider>
  );
}
