import { useState } from "react";
import { Box, Button, Center, Flex, Input, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { api } from "../api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    try { await api.forgotAdminPassword(email); setSent(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to request a reset link."); }
    finally { setLoading(false); }
  };
  return <Center minH="100vh" bg="#f4f7f5" px="4"><Box as="form" onSubmit={submit} w="full" maxW="420px" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p={{ base: "6", md: "8" }} boxShadow="lg">
    <Flex h="12" w="12" mb="5" align="center" justify="center" borderRadius="xl" bg="#b7e4c7" color="#19382b" fontWeight="bold">JP</Flex>
    <Text as="h1" fontSize="2xl" fontWeight="bold">Forgot password</Text>
    {sent ? <Text mt="3" color="gray.600" fontSize="sm">If an active admin account exists for that email, a password reset link has been sent.</Text> : <>
      <Text mt="2" mb="6" color="gray.500" fontSize="sm">Enter your admin email and we’ll send you a reset link.</Text>
      {error && <Box mb="4" borderRadius="lg" bg="red.50" p="3" color="red.700" fontSize="sm" role="alert">{error}</Box>}
      <Text mb="1" fontSize="sm" fontWeight="semibold">Email</Text><Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button type="submit" loading={loading} mt="6" w="full" bg="green.600" color="white" _hover={{ bg: "green.700" }}>Send reset link</Button>
    </>}
    <Text mt="5" textAlign="center" fontSize="sm"><Link to="/login" style={{ color: "#25804d" }}>Back to sign in</Link></Text>
  </Box></Center>;
}
