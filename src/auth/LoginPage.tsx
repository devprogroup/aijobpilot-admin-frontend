import { useState } from "react";
import { Box, Button, Center, Flex, Input, Text } from "@chakra-ui/react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate((location.state as any)?.from || "/dashboard", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return <Center minH="100vh" bg="#f4f7f5" px="4">
    <Box as="form" onSubmit={submit} w="full" maxW="420px" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p={{ base: "6", md: "8" }} boxShadow="lg">
      <Flex h="12" w="12" mb="5" align="center" justify="center" borderRadius="xl" bg="#b7e4c7" color="#19382b" fontWeight="bold">JP</Flex>
      <Text as="h1" fontSize="2xl" fontWeight="bold">Admin sign in</Text>
      <Text mt="2" mb="6" color="gray.500" fontSize="sm">Sign in with an administrator account to continue.</Text>
      {error && <Box mb="4" borderRadius="lg" bg="red.50" p="3" color="red.700" fontSize="sm">{error}</Box>}
      <Box><Text mb="1" fontSize="sm" fontWeight="semibold">Email</Text><Input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></Box>
      <Box mt="4"><Text mb="1" fontSize="sm" fontWeight="semibold">Password</Text><Input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Box>
      <Flex mt="3" justify="flex-end"><Link to="/forgot-password" style={{ color: "#25804d", fontSize: 14 }}>Forgot password?</Link></Flex>
      <Button type="submit" loading={loading} mt="6" w="full" bg="green.600" color="white" _hover={{ bg: "green.700" }}>Sign in</Button>
    </Box>
  </Center>;
}
