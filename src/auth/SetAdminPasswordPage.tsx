import { useState } from "react";
import { Box, Button, Center, Flex, Input, Text } from "@chakra-ui/react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";

export function SetAdminPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!token) { setError("This link is missing its token. Request a new password reset email."); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setLoading(true);
    try { await api.resetAdminPassword(token, password); setComplete(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to reset the password."); }
    finally { setLoading(false); }
  };

  return <Center minH="100vh" bg="#f4f7f5" px="4"><Box as="form" onSubmit={submit} w="full" maxW="420px" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p={{ base: "6", md: "8" }} boxShadow="lg">
    <Flex h="12" w="12" mb="5" align="center" justify="center" borderRadius="xl" bg="#b7e4c7" color="#19382b" fontWeight="bold">JP</Flex>
    <Text as="h1" fontSize="2xl" fontWeight="bold">Reset admin password</Text>
    {complete ? <><Text mt="3" color="green.700" fontSize="sm">Your password has been changed.</Text><Button asChild mt="6" w="full" bg="green.600" color="white"><Link to="/login">Continue to sign in</Link></Button></> : <>
      <Text mt="2" mb="6" color="gray.500" fontSize="sm">Choose a password with at least 12 characters.</Text>
      {error && <Box mb="4" borderRadius="lg" bg="red.50" p="3" color="red.700" fontSize="sm" role="alert">{error}</Box>}
      <Text mb="1" fontSize="sm" fontWeight="semibold">New password</Text><Input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
      <Text mt="4" mb="1" fontSize="sm" fontWeight="semibold">Confirm password</Text><Input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      <Button type="submit" loading={loading} mt="6" w="full" bg="green.600" color="white" _hover={{ bg: "green.700" }}>Reset password</Button>
    </>}
  </Box></Center>;
}
