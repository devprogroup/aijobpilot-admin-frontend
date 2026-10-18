import { useCallback, useEffect, useState } from "react";
import { Box, Button, Dialog, Field, Flex, IconButton, Input, NativeSelect, Portal, Table, Text } from "@chakra-ui/react";
import { Pencil } from "lucide-react";
import { api } from "../../api";
import type { AdminUser, AdminUserRole } from "../../types";
import { useAuth } from "../../auth/AuthContext";
import { AdminUserPasswordDialog } from "./AdminUserPasswordDialog";

const roleLabels: Record<AdminUserRole, string> = { super_admin: "Super admin", support: "Support", technical: "Technical" };

export function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();
  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const visibleAdmins = admins.filter((admin) => admin.role !== "super_admin");
  const [passwordAdmin, setPasswordAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [balanceDrafts, setBalanceDrafts] = useState<Record<number, string>>({});
  const [balanceAdmin, setBalanceAdmin] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    void api.adminUsers().then(({ adminUsers }) => {
      setAdmins(adminUsers);
      setBalanceDrafts(Object.fromEntries(adminUsers.map((admin) => [admin.id, String(admin.promocodeBalance ?? 0)])));
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load admin accounts.")).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const updateAdmin = (updated: AdminUser) => setAdmins((current) => current.map((entry) => entry.id === updated.id ? updated : entry));

  const updateRole = async (admin: AdminUser, role: AdminUserRole) => {
    if (role === admin.role) return;
    setError(""); setMessage(""); setBusyId(admin.id);
    try {
      const result = await api.updateAdminUser(admin.id, { role });
      updateAdmin(result.adminUser);
      setMessage(`${admin.email} role changed to ${roleLabels[role]}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update admin role.");
    } finally { setBusyId(null); }
  };

  const updateStatus = async (admin: AdminUser, status: "active" | "inactive") => {
    if (status === admin.status) return;
    setError(""); setMessage(""); setBusyId(admin.id);
    try {
      const result = await api.setAdminUserStatus(admin.id, status);
      updateAdmin(result.adminUser);
      setMessage(`${admin.email} ${status === "active" ? "activated" : "deactivated"}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update account status."); }
    finally { setBusyId(null); }
  };

  const saveBalance = async (admin: AdminUser) => {
    if (admin.role === "super_admin") return;
    const rawValue = balanceDrafts[admin.id] ?? String(admin.promocodeBalance ?? 0);
    const promocodeBalance = Number(rawValue.trim());
    if (!Number.isInteger(promocodeBalance) || promocodeBalance < 0) {
      setError("Enter a whole number of 0 or more.");
      setBalanceDrafts((current) => ({ ...current, [admin.id]: String(admin.promocodeBalance ?? 0) }));
      return;
    }
    if (promocodeBalance === admin.promocodeBalance) { setBalanceAdmin(null); return; }
    setError(""); setMessage(""); setBusyId(admin.id);
    try {
      const result = await api.setAdminUserPromocodeBalance(admin.id, promocodeBalance);
      updateAdmin(result.adminUser);
      setBalanceAdmin(null);
      setMessage(`${admin.email} promo code balance set to ${promocodeBalance}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update promo code balance.");
      setBalanceDrafts((current) => ({ ...current, [admin.id]: String(admin.promocodeBalance ?? 0) }));
    } finally { setBusyId(null); }
  };

  const deleteAdmin = async (admin: AdminUser) => {
    if (!window.confirm(`Delete the admin account for ${admin.email}? This action cannot be undone.`)) return;
    setError(""); setMessage(""); setBusyId(admin.id);
    try {
      await api.deleteAdminUser(admin.id);
      setAdmins((current) => current.filter((entry) => entry.id !== admin.id));
      setMessage(`Admin account deleted for ${admin.email}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete admin account."); }
    finally { setBusyId(null); }
  };

  return <>
    {passwordAdmin && <AdminUserPasswordDialog admin={passwordAdmin} onClose={() => setPasswordAdmin(null)} onSaved={() => { setPasswordAdmin(null); setMessage(`Password updated for ${passwordAdmin.email}; existing sessions have been signed out.`); }} />}
    {balanceAdmin && <Dialog.Root open onOpenChange={({ open }) => { if (!open && busyId !== balanceAdmin.id) { setBalanceDrafts((current) => ({ ...current, [balanceAdmin.id]: String(balanceAdmin.promocodeBalance ?? 0) })); setBalanceAdmin(null); } }}>
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content p="6" mx="4" maxW="sm" borderRadius="2xl">
        <Dialog.Title fontSize="lg" fontWeight="bold">Promo code balance</Dialog.Title>
        <Dialog.Description mt="2" mb="5" color="gray.600">Update the available promo code balance for {balanceAdmin.email}.</Dialog.Description>
        <Field.Root><Field.Label>Balance</Field.Label><Input autoFocus type="number" min={0} step={1} value={balanceDrafts[balanceAdmin.id] ?? String(balanceAdmin.promocodeBalance ?? 0)} disabled={busyId === balanceAdmin.id} onChange={(event) => setBalanceDrafts((current) => ({ ...current, [balanceAdmin.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") void saveBalance(balanceAdmin); }} /></Field.Root>
        <Flex mt="6" justify="flex-end" gap="3"><Button variant="outline" disabled={busyId === balanceAdmin.id} onClick={() => { setBalanceDrafts((current) => ({ ...current, [balanceAdmin.id]: String(balanceAdmin.promocodeBalance ?? 0) })); setBalanceAdmin(null); }}>Cancel</Button><Button colorPalette="green" loading={busyId === balanceAdmin.id} onClick={() => void saveBalance(balanceAdmin)}>Save balance</Button></Flex>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>}
    <Flex mb="6" align={{ base: "start", md: "end" }} justify="space-between" gap="4" flexDir={{ base: "column", md: "row" }}>
      <Box><Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Access control</Text><Text as="h1" m="0" fontSize="3xl" fontWeight="bold">Admin users</Text><Text mt="2" maxW="720px" fontSize="sm" color="gray.500">Manage admin details, roles, account status, and promo code balances.</Text></Box>
    </Flex>
    {(error || message) && <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"} role={error ? "alert" : "status"}>{error || message}</Box>}
    <Box overflow="hidden" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white">
      <Flex px="5" py="4" borderBottom="1px solid" borderColor="gray.100" justify="space-between" align="center"><Text fontWeight="semibold">Admin accounts</Text><Text fontSize="sm" color="gray.500">{visibleAdmins.length} total</Text></Flex>
      {loading ? <Text p="8" textAlign="center" color="gray.500">Loading admin accounts…</Text> : visibleAdmins.length === 0 ? <Text p="8" textAlign="center" color="gray.500">No admin accounts found.</Text> : <Box overflowX="auto"><Table.Root minW="1050px" size="sm">
        <Table.Header><Table.Row>
          <Table.ColumnHeader>Name</Table.ColumnHeader><Table.ColumnHeader>Email</Table.ColumnHeader><Table.ColumnHeader>Role</Table.ColumnHeader><Table.ColumnHeader>Promo code balance</Table.ColumnHeader><Table.ColumnHeader>Active status</Table.ColumnHeader><Table.ColumnHeader>Added date</Table.ColumnHeader><Table.ColumnHeader>Actions</Table.ColumnHeader>
        </Table.Row></Table.Header>
        <Table.Body>{visibleAdmins.map((admin) => <Table.Row key={admin.id}>
          <Table.Cell fontWeight="medium">{admin.name || "—"}{admin.id === currentAdmin?.id ? " (you)" : ""}</Table.Cell>
          <Table.Cell>{admin.email}</Table.Cell>
          <Table.Cell><NativeSelect.Root size="sm" disabled={!isSuperAdmin || busyId === admin.id || admin.id === currentAdmin?.id} minW="36"><NativeSelect.Field aria-label={`Role for ${admin.email}`} value={admin.role} onChange={(event) => void updateRole(admin, event.target.value as AdminUserRole)}><option value="support">Support</option><option value="technical">Technical</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Table.Cell>
          <Table.Cell>{admin.role === "super_admin" ? <Text color="gray.500">Unlimited</Text> : <Flex align="center" gap="1"><Text minW="6">{admin.promocodeBalance ?? 0}</Text><IconButton aria-label={`Edit promo code balance for ${admin.email}`} size="xs" variant="ghost" disabled={!isSuperAdmin || busyId === admin.id} onClick={() => { setBalanceDrafts((current) => ({ ...current, [admin.id]: String(admin.promocodeBalance ?? 0) })); setBalanceAdmin(admin); }}><Pencil size={14} /></IconButton></Flex>}</Table.Cell>
          <Table.Cell><NativeSelect.Root size="sm" disabled={!isSuperAdmin || busyId === admin.id || admin.id === currentAdmin?.id} minW="28"><NativeSelect.Field aria-label={`Status for ${admin.email}`} value={admin.status} onChange={(event) => void updateStatus(admin, event.target.value as "active" | "inactive")}><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Table.Cell>
          <Table.Cell whiteSpace="nowrap">{new Date(admin.createdAt).toLocaleDateString()}</Table.Cell>
          <Table.Cell><Flex gap="2"><Button size="xs" variant="outline" disabled={!isSuperAdmin || busyId === admin.id || admin.id === currentAdmin?.id} onClick={() => setPasswordAdmin(admin)}>Update password</Button><Button size="xs" variant="outline" colorPalette="red" disabled={!isSuperAdmin || busyId === admin.id || admin.id === currentAdmin?.id} loading={busyId === admin.id} onClick={() => void deleteAdmin(admin)}>Delete</Button></Flex></Table.Cell>
        </Table.Row>)}</Table.Body>
      </Table.Root></Box>}
    </Box>
  </>;
}
