import { useState, type FormEvent } from "react";
import { Button, Dialog, Field, Flex, Input, NativeSelect, Portal, Text } from "@chakra-ui/react";
import { api } from "../../api";
import type { AdminUser, AdminUserRole } from "../../types";

/** Super admins add support/technical admins here (POST /api/admin-users). Super admins themselves
 * aren't listed or managed on this page, so they aren't offered as a role. */
export function AddAdminUserDialog({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (admin: AdminUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AdminUserRole>("support");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError("Enter a valid email address."); return; }
    if (password.length < 12 || password.length > 128) { setError("Password must be 12–128 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setSaving(true); setError("");
    try {
      const { adminUser } = await api.createAdminUser({ email: trimmedEmail, name: name.trim() || null, role, password });
      onCreated(adminUser);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add the admin account.");
    } finally { setSaving(false); }
  };

  return <Dialog.Root open onOpenChange={({ open }) => { if (!open && !saving) onClose(); }}>
    <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content as="form" onSubmit={(event) => void submit(event)} p="6" mx="4" maxW="md" borderRadius="2xl">
      <Dialog.Title fontSize="lg" fontWeight="bold">Add admin user</Dialog.Title>
      <Dialog.Description mt="2" mb="5" color="gray.600">Create an admin account. Share the password with them securely; they can sign in right away.</Dialog.Description>
      <Flex direction="column" gap="4">
        <Field.Root required><Field.Label>Email</Field.Label><Input autoFocus type="email" maxLength={255} autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} /></Field.Root>
        <Field.Root><Field.Label>Name</Field.Label><Input maxLength={255} autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" /></Field.Root>
        <Field.Root required><Field.Label>Role</Field.Label><NativeSelect.Root><NativeSelect.Field value={role} onChange={(event) => setRole(event.target.value as AdminUserRole)}><option value="support">Support</option><option value="technical">Technical</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
        <Field.Root required><Field.Label>Password</Field.Label><Input type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><Field.HelperText>12–128 characters.</Field.HelperText></Field.Root>
        <Field.Root required><Field.Label>Confirm password</Field.Label><Input type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></Field.Root>
      </Flex>
      {error && <Text role="alert" mt="3" color="red.600">{error}</Text>}
      <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" colorPalette="green" loading={saving}>Add admin</Button></Flex>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}
