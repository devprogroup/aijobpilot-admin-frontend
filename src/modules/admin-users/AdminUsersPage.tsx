import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import { api } from "../../api";
import type { AdminUser, AdminUserRole } from "../../types";
import { useAuth } from "../../auth/AuthContext";

const roleLabels: Record<AdminUserRole, string> = { super_admin: "Super admin", support: "Support", technical: "Technical" };

export function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<AdminUserRole>("support");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    void api.adminUsers().then(({ adminUsers }) => setAdmins(adminUsers)).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load admin accounts.")).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage(""); setSaving(true);
    try {
      if (password.length < 12) throw new Error("Use an initial password with at least 12 characters.");
      if (password !== confirmPassword) throw new Error("The passwords do not match.");
      const result = await api.createAdminUser({ email: email.trim().toLowerCase(), name: name.trim() || null, role, password });
      setEmail(""); setName(""); setRole("support"); setPassword(""); setConfirmPassword(""); setFormOpen(false);
      setMessage(`Admin account created and activated for ${result.adminUser.email}.`);
      load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create admin account."); }
    finally { setSaving(false); }
  };

  const updateStatus = async (admin: AdminUser) => {
    const status = admin.status === "active" ? "inactive" : "active";
    setError(""); setMessage(""); setBusyId(admin.id);
    try {
      const result = await api.setAdminUserStatus(admin.id, status);
      setAdmins((current) => current.map((entry) => entry.id === admin.id ? result.adminUser : entry));
      setMessage(`${admin.email} ${status === "active" ? "activated" : "deactivated"}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update account status."); }
    finally { setBusyId(null); }
  };

  const updatePromocodeBalance = async (admin: AdminUser) => {
    const input = window.prompt(`Promo code balance for ${admin.email}`, String(admin.promocodeBalance ?? 0));
    if (input === null) return;
    const promocodeBalance = Number(input.trim());
    if (!Number.isInteger(promocodeBalance) || promocodeBalance < 0) { setError("Enter a whole number of 0 or more."); return; }
    setError(""); setMessage(""); setBusyId(admin.id);
    try {
      const result = await api.setAdminUserPromocodeBalance(admin.id, promocodeBalance);
      setAdmins((current) => current.map((entry) => entry.id === admin.id ? result.adminUser : entry));
      setMessage(`${admin.email} promo code balance set to ${promocodeBalance}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update promo code balance."); }
    finally { setBusyId(null); }
  };

  return <>
    <Flex mb="6" align={{ base: "start", md: "end" }} justify="space-between" gap="4" flexDir={{ base: "column", md: "row" }}>
      <Box><Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">Access control</Text><Text as="h1" m="0" fontSize="3xl" fontWeight="bold">Admin users</Text><Text mt="2" maxW="720px" fontSize="sm" color="gray.500">Create admin accounts, provide an initial password, assign roles, and manage access.</Text></Box>
      <Button colorPalette="green" onClick={() => { setFormOpen((open) => !open); setError(""); }}>Create admin user</Button>
    </Flex>
    {(error || message) && <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"} role={error ? "alert" : "status"}>{error || message}</Box>}
    {formOpen && <Box as="form" onSubmit={(event: FormEvent) => void create(event)} mb="6" maxW="3xl" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white" p={{ base: "5", md: "6" }}>
      <Text mb="4" fontSize="lg" fontWeight="bold">Create admin account</Text>
      <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
        <label><Text mb="1" fontSize="sm" fontWeight="semibold">Email</Text><Input type="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label><Text mb="1" fontSize="sm" fontWeight="semibold">Name <Text as="span" color="gray.400" fontWeight="normal">(optional)</Text></Text><Input maxLength={255} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label><Text mb="1" fontSize="sm" fontWeight="semibold">Role</Text><select className="input" value={role} onChange={(event) => setRole(event.target.value as AdminUserRole)}><option value="super_admin">Super admin</option><option value="support">Support</option><option value="technical">Technical</option></select></label>
        <label><Text mb="1" fontSize="sm" fontWeight="semibold">Initial password</Text><Input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label><Text mb="1" fontSize="sm" fontWeight="semibold">Confirm initial password</Text><Input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
      </Box>
      <Flex mt="5" justify="flex-end" gap="3"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" colorPalette="green" loading={saving}>Create admin account</Button></Flex>
    </Box>}
    <Box overflow="hidden" border="1px solid" borderColor="gray.200" borderRadius="2xl" bg="white">
      <Flex px="5" py="4" borderBottom="1px solid" borderColor="gray.100" justify="space-between" align="center"><Text fontWeight="semibold">Admin accounts</Text><Text fontSize="sm" color="gray.500">{admins.length} total</Text></Flex>
      {loading ? <Text p="8" textAlign="center" color="gray.500">Loading admin accounts…</Text> : admins.length === 0 ? <Text p="8" textAlign="center" color="gray.500">No admin accounts found.</Text> : admins.map((admin) => (
        <Flex key={admin.id} align={{ base: "start", md: "center" }} justify="space-between" gap="4" p="5" borderBottom="1px solid" borderColor="gray.100" flexDir={{ base: "column", md: "row" }}>
          <Box minW="0"><Text fontWeight="semibold">{admin.name || admin.email}{admin.id === currentAdmin?.id ? " (you)" : ""}</Text>{admin.name && <Text fontSize="sm" color="gray.500">{admin.email}</Text>}<Flex mt="2" gap="3" align="center" flexWrap="wrap"><Text fontSize="xs" color="gray.500">{roleLabels[admin.role]}</Text><Text fontSize="xs" fontWeight="semibold" color={admin.status === "active" ? "green.700" : "orange.700"}>{admin.status === "active" ? "Active" : "Inactive"}</Text><Text fontSize="xs" color="gray.500">Promo code balance: {admin.role === "super_admin" ? "Unlimited" : admin.promocodeBalance ?? 0}</Text><Text fontSize="xs" color="gray.400">Added {new Date(admin.createdAt).toLocaleDateString()}</Text></Flex></Box>
          <Flex gap="2" flexWrap="wrap">{admin.role !== "super_admin" && <Button size="sm" variant="outline" loading={busyId === admin.id} onClick={() => void updatePromocodeBalance(admin)}>Set promo balance</Button>}<Button size="sm" variant="outline" colorPalette={admin.status === "active" ? "red" : "green"} disabled={admin.id === currentAdmin?.id} loading={busyId === admin.id} onClick={() => void updateStatus(admin)}>{admin.status === "active" ? "Deactivate" : "Activate"}</Button></Flex>
        </Flex>
      ))}
    </Box>
  </>;
}
