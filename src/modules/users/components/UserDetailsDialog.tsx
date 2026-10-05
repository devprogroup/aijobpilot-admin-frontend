import { useState } from "react";
import { Box, Button, Dialog, Field, Flex, Input, Portal, Text } from "@chakra-ui/react";
import type { User } from "../../../types";
import { api } from "../../../api";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export function UserDetailsDialog({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: (user: User) => void }) {
  const [credit, setCredit] = useState(String(user.credit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = Number(credit);
      if (!credit.trim() || !Number.isFinite(updated)) throw new Error("Enter a valid credit balance.");
      onSaved((await api.updateUser(user.id, { credit: updated })).user);
    }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to update account"); }
    finally { setSaving(false); }
  };
  return <Dialog.Root open onOpenChange={({ open }) => { if (!open && !saving) onClose(); }}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content p="6" mx="4" maxW="lg" borderRadius="2xl">
    <Dialog.Title mb="4">Edit account · Account #{user.id}</Dialog.Title>
    <Box as="form" onSubmit={save}>
      <Text mb="2">Username: {user.username}</Text><Text mb="2">Email: {user.email || "Not provided"}</Text>
      {user.email && <Text mb="2">Email {user.emailVerified ? "verified" : "unverified"}</Text>}
      <StatusBadge status={user.status} />
      <Text mt="3">Credit: {user.credit.toLocaleString(undefined, { maximumFractionDigits: 6 })}</Text>
      <Text fontSize="sm" mt="2">Profiles: {user._count?.profiles ?? 0} · Applications: {user._count?.applications ?? 0}</Text>
      <Text fontSize="sm" mt="2">Joined: {new Date(user.createdAt).toLocaleString()}</Text>
      <Text fontSize="sm" mb="4">Updated: {new Date(user.updatedAt).toLocaleString()}</Text>
      <Text mb="3">Name: {user.name || "Not set"}</Text>
      <Field.Root mt="4"><Field.Label>Credit balance</Field.Label><Input type="number" step="0.000001" value={credit} required disabled={saving} onChange={(event) => setCredit(event.target.value)} /></Field.Root>
      {error && <Text role="alert" mt="3" color="red.600">{error}</Text>}
      <Flex justify="flex-end" gap="3" mt="5"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Close</Button><Button type="submit" bg="green.600" color="white" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button></Flex>
    </Box>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}
