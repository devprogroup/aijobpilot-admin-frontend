import { useState, type FormEvent } from "react";
import { Button, Dialog, Field, Flex, Input, Portal, Text } from "@chakra-ui/react";
import { api } from "../../api";
import type { AdminUser } from "../../types";

export function AdminUserPasswordDialog({ admin, onClose, onSaved }: {
  admin: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 12 || password.length > 128) { setError("Password must be 12–128 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setSaving(true); setError("");
    try {
      await api.updateAdminUserPassword(admin.id, password);
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update password.");
    } finally { setSaving(false); }
  };

  return <Dialog.Root open onOpenChange={({ open }) => { if (!open && !saving) onClose(); }}>
    <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content as="form" onSubmit={(event) => void submit(event)} p="6" mx="4" maxW="md" borderRadius="2xl">
      <Dialog.Title fontSize="lg" fontWeight="bold">Update password</Dialog.Title>
      <Dialog.Description mt="2" mb="5" color="gray.600">Set a new password for {admin.email}. This signs the account out of existing sessions.</Dialog.Description>
      <Flex direction="column" gap="4">
        <Field.Root required><Field.Label>New password</Field.Label><Input type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field.Root>
        <Field.Root required><Field.Label>Confirm password</Field.Label><Input type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></Field.Root>
      </Flex>
      {error && <Text role="alert" mt="3" color="red.600">{error}</Text>}
      <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" colorPalette="green" loading={saving}>Update password</Button></Flex>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}
