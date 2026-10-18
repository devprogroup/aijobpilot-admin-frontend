import { Box, Flex, Text } from "@chakra-ui/react";
import { useAuth } from "../../auth/AuthContext";
import { ChangePasswordPage } from "../../auth/ChangePasswordPage";
import { Navigate } from "react-router-dom";

const roleLabels = {
  super_admin: "Super admin",
  support: "Support",
  technical: "Technical",
} as const;

export function AccountPage() {
  const { user } = useAuth();

  if (user?.role === "support") return <Navigate to="/promo-codes" replace />;

  return (
    <>
      <Box mb="6">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Admin workspace</Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Account</Text>
        <Text mt="2" maxW="760px" fontSize="sm" color="gray.500">Manage your admin account.</Text>
      </Box>

      <Flex mb="6" align={{ base: "start", md: "center" }} justify="space-between" gap="4" flexWrap="wrap" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p="5">
        <Box>
          <Text fontSize="lg" fontWeight="bold">{user?.name || user?.email}</Text>
          {user?.name && <Text mt="1" fontSize="sm" color="gray.500">{user.email}</Text>}
          <Flex mt="3" gap="3" align="center" flexWrap="wrap">
            <Text fontSize="xs" color="gray.500">{user ? roleLabels[user.role] : "Admin"}</Text>
            <Text fontSize="xs" fontWeight="semibold" color={user?.status === "active" ? "green.700" : "orange.700"}>{user?.status === "active" ? "Active" : "Inactive"}</Text>
          </Flex>
        </Box>
      </Flex>

      <Box mt="10">
        <ChangePasswordPage embedded />
      </Box>
    </>
  );
}
