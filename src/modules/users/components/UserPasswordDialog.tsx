import { useState, type FormEvent } from "react";
import { Box, Button, Dialog, Field, Flex, Input, Portal, Text } from "@chakra-ui/react";
import type { User } from "../../../types";
import { api } from "../../../api";

export function UserPasswordDialog({ user, onClose, onSaved }: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmation) return setError("Passwords do not match.");
    setSaving(true);
    setError("");
    try {
      await api.updateUserPassword(user.id, password);
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update password.");
    } finally { setSaving(false); }
  };

  return <Dialog.Root open onOpenChange={({ open }) => { if (!open && !saving) onClose(); }}>
    <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content as="form" onSubmit={save} p="6" mx="4" maxW="lg" borderRadius="2xl">
      <Dialog.Title fontSize="lg" fontWeight="bold">Update password</Dialog.Title>
      <Dialog.Description mt="2" mb="5" color="gray.600">Set a new password for {user.name || user.username} at their request. They will need the new password to sign in.</Dialog.Description>
      <Box display="flex" flexDirection="column" gap="4">
        <Field.Root><Field.Label>New password</Field.Label><Input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} disabled={saving} onChange={(event) => setPassword(event.target.value)} required /></Field.Root>
        <Field.Root><Field.Label>Confirm new password</Field.Label><Input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} disabled={saving} onChange={(event) => setConfirmation(event.target.value)} required /></Field.Root>
      </Box>
      {error && <Text role="alert" mt="3" color="red.600">{error}</Text>}
      <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" colorPalette="green" loading={saving}>Update password</Button></Flex>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}
