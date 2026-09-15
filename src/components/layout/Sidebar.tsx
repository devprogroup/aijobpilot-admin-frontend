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
  ChevronDown,
  ListTree,
  LogOut,
  Mail,
  Globe,
  PanelLeftClose,
  Sparkles,
  Settings,
  Users,
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
  const usersActive = location.pathname.startsWith("/users");
  const dashboardActive = location.pathname.startsWith("/dashboard");
  const settingsActive = location.pathname.startsWith("/settings");
  const emailTemplatesActive = location.pathname.startsWith("/email-templates");
  const [crawlersOpen, setCrawlersOpen] = useState(crawlerActive);

  useEffect(() => {
    if (crawlerActive) setCrawlersOpen(true);
  }, [crawlerActive]);

  useEffect(() => {
    if (applicationsActive) setApplicationsOpen(true);
  }, [applicationsActive]);

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
                <ChildLink to="/applications/failed" icon={ListTree} onClick={onClose}>
                  Failed applications
                </ChildLink>
                <ChildLink to="/applications/statistics" icon={BarChart3} onClick={onClose}>
                  Statistics
                </ChildLink>
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>

          <NavLink
            to="/users"
            onClick={onClose}
            style={{ textDecoration: "none" }}
          >
            <Flex
              align="center"
              gap="3"
              borderRadius="xl"
              px="4"
              py="3"
              fontSize="sm"
              fontWeight="semibold"
              bg={usersActive ? "white" : "transparent"}
              color={usersActive ? "#17211b" : "whiteAlpha.700"}
              boxShadow={usersActive ? "sm" : "none"}
              _hover={
                usersActive
                  ? undefined
                  : { bg: "whiteAlpha.200", color: "white" }
              }
            >
              <Icon as={Users} boxSize="5" />
              Users
            </Flex>
          </NavLink>
          <NavLink to="/settings" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={settingsActive ? "white" : "transparent"} color={settingsActive ? "#17211b" : "whiteAlpha.700"} boxShadow={settingsActive ? "sm" : "none"} _hover={settingsActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Settings} boxSize="5" />
              Settings
            </Flex>
          </NavLink>
          <NavLink to="/email-templates" onClick={onClose} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" borderRadius="xl" px="4" py="3" fontSize="sm" fontWeight="semibold" bg={emailTemplatesActive ? "white" : "transparent"} color={emailTemplatesActive ? "#17211b" : "whiteAlpha.700"} boxShadow={emailTemplatesActive ? "sm" : "none"} _hover={emailTemplatesActive ? undefined : { bg: "whiteAlpha.200", color: "white" }}>
              <Icon as={Mail} boxSize="5" />
              Email templates
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
          <Button mt="3" size="sm" w="full" variant="ghost" color="whiteAlpha.700" _hover={{ bg: "whiteAlpha.200", color: "white" }} onClick={() => void logout()}>
            <Icon as={LogOut} boxSize="4" /> Sign out
          </Button>
        </Box>
      </Box>
    </>
  );
}
