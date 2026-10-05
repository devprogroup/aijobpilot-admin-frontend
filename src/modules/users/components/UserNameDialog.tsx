import { useState, type FormEvent } from "react";
import { Button, Dialog, Field, Flex, Input, Portal, Text } from "@chakra-ui/react";
import type { User } from "../../../types";
import { api } from "../../../api";

export function UserNameDialog({ user, onClose, onSaved }: {
  user: User;
  onClose: () => void;
  onSaved: (user: User) => void;
}) {
  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      onSaved((await api.updateUser(user.id, { name: name.trim() || null })).user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update user name.");
    } finally { setSaving(false); }
  };

  return <Dialog.Root open onOpenChange={({ open }) => { if (!open && !saving) onClose(); }}>
    <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content as="form" onSubmit={save} p="6" mx="4" maxW="lg" borderRadius="2xl">
      <Dialog.Title fontSize="lg" fontWeight="bold">Edit user name</Dialog.Title>
      <Dialog.Description mt="2" mb="5" color="gray.600">Account #{user.id} · {user.username}</Dialog.Description>
      <Field.Root><Field.Label>Name</Field.Label><Input value={name} maxLength={255} disabled={saving} onChange={(event) => setName(event.target.value)} /></Field.Root>
      {error && <Text role="alert" mt="3" color="red.600">{error}</Text>}
      <Flex mt="6" justify="flex-end" gap="3"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" colorPalette="green" loading={saving}>Save name</Button></Flex>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}
