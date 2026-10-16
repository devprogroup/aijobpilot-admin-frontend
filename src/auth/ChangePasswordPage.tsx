import { useState } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import { api } from "../api";

export function ChangePasswordPage({ embedded = false }: { embedded?: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    if (password !== confirm) { setError("The new passwords do not match."); return; }
    setSaving(true);
    try { await api.changeAdminPassword(currentPassword, password); setCurrentPassword(""); setPassword(""); setConfirm(""); setMessage("Password changed."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to change the password."); }
    finally { setSaving(false); }
  };
  return <>
    <Box mb="6"><Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">{embedded ? "Security" : "Account"}</Text><Text as={embedded ? "h2" : "h1"} m="0" fontSize={embedded ? "xl" : "3xl"} fontWeight="bold">Change password</Text><Text mt="2" fontSize="sm" color="gray.500">Use at least 12 characters for your new password.</Text></Box>
    <Box as="form" onSubmit={submit} maxW="lg" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p={{ base: "5", md: "7" }}>
      {(error || message) && <Box mb="5" borderRadius="lg" bg={error ? "red.50" : "green.50"} p="3" color={error ? "red.700" : "green.700"} fontSize="sm" role={error ? "alert" : "status"}>{error || message}</Box>}
      <Text mb="1" fontSize="sm" fontWeight="semibold">Current password</Text><Input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      <Text mt="4" mb="1" fontSize="sm" fontWeight="semibold">New password</Text><Input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
      <Text mt="4" mb="1" fontSize="sm" fontWeight="semibold">Confirm new password</Text><Input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      <Flex mt="6" justify="flex-end"><Button type="submit" colorPalette="green" loading={saving}>Update password</Button></Flex>
    </Box>
  </>;
}
