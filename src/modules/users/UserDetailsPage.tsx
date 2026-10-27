import { useEffect, useState } from "react";
import { Box, Button, Flex, NativeSelect, SimpleGrid, Table, Text } from "@chakra-ui/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { api } from "../../api";
import type { User, UserDetails } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { UserDetailsDialog } from "./components/UserDetailsDialog";
import { UserNameDialog } from "./components/UserNameDialog";
import { UserPaymentHistory } from "./components/UserPaymentHistory";
import { useAuth } from "../../auth/AuthContext";

const time = (value: string | null) => value ? new Date(value).toLocaleString() : "—";
export function UserDetailsPage() {
  // Technical admins can view a client; only super admins change it (the API enforces it).
  const { user: currentAdmin } = useAuth();
  const canEditClients = currentAdmin?.role === "super_admin";
  const { userId } = useParams();
  const id = Number(userId);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    setDetails(null); setLoading(true); setError(""); setEditing(false);
    if (!Number.isSafeInteger(id) || id < 1) { setError("Invalid user ID"); setLoading(false); return; }
    api.user(id).then((value) => { if (active) setDetails(value); })
      .catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : "Unable to load user"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, revision]);
  const navigate = useNavigate();
  const deleteUser = async () => {
    if (!details) return;
    const name = details.user.username || details.user.email || `#${id}`;
    const typed = window.prompt(
      `Permanently delete ${name} and everything of theirs: all profiles, applications, job matches, private jobs, uploads, messages, credit history and files. This cannot be undone.\n\nType ${name} to confirm.`,
    );
    if (typed === null) return;
    if (typed.trim() !== name) { setError("The name you typed didn't match; nothing was deleted."); return; }
    setSaving(true); setError("");
    try {
      await api.deleteUser(id);
      navigate("/users/clients", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete user.");
      setSaving(false);
    }
  };
  const deleteProfile = async (profile: UserDetails["profiles"][number]) => {
    const name = profile.name || `Profile #${profile.id}`;
    if (!window.confirm(`Permanently delete ${name}: its applications, job matches, inbound email and resume files. This cannot be undone.`)) return;
    setSaving(true); setError("");
    try {
      await api.deleteUserProfile(id, profile.id);
      setRevision((value) => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete profile.");
    } finally { setSaving(false); }
  };
  const update = (user: User) => setDetails((old) => old ? { ...old, user: { ...old.user, ...user } } : old);
  const changeStatus = async (status: User["status"]) => {
    setSaving(true); setError("");
    try { update((await api.setUserStatus(id, status)).user); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to update status"); }
    finally { setSaving(false); }
  };
  return <Box>
    <Link to="/users/clients">← Back to clients</Link>
    <Flex mt="5" mb="6" justify="space-between" align="center"><Box><Text as="h1" fontSize="3xl" fontWeight="bold">{details?.user.name || details?.user.username || "User details"}</Text><Text color="gray.500">Account #{userId}</Text></Box><Flex gap="2"><Button variant="outline" disabled={!details || loading || saving} onClick={() => setEditingName(true)}>Edit name</Button><Button variant="outline" disabled={loading || saving} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>{canEditClients && <Button variant="outline" colorPalette="red" disabled={!details || loading || saving} onClick={() => void deleteUser()}><Trash2 size={16} />Delete user</Button>}</Flex></Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
    {loading && <Text role="status">Loading user details...</Text>}
    {details && <>
      <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p="6" mb="6">
        <Flex justify="space-between" align="center" mb="4"><Text fontWeight="bold">Account information</Text>{canEditClients && <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditing(true)}>Edit account</Button>}</Flex>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="5">
          {[['User ID', String(details.user.id)], ['Name', details.user.name || 'Not set'], ['Username', details.user.username], ['Email', details.user.email || 'Not provided'], ['Email verification', details.user.emailVerified ? 'Verified' : 'Unverified'], ['Credit', details.user.credit.toLocaleString(undefined, { maximumFractionDigits: 6 })], ['Joined', time(details.user.createdAt)], ['Last updated', time(details.user.updatedAt)]].map(([label, value]) => <Box key={label}><Text fontSize="sm" color="gray.500">{label}</Text><Text overflowWrap="anywhere">{value}</Text></Box>)}
          <Box><Text fontSize="sm" color="gray.500" mb="1">Account status</Text><NativeSelect.Root disabled={!canEditClients || saving}><NativeSelect.Field aria-label="Account status" value={details.user.status} onChange={(event) => void changeStatus(event.target.value as User['status'])}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
        </SimpleGrid>
      </Box>
      <Box bg="white" borderRadius="2xl" p="5" mb="6" overflowX="auto">
        <Text fontWeight="bold">Profiles ({details.user._count?.profiles ?? 0})</Text><Text fontSize="xs" color="gray.500" mb="4">Latest {details.profiles.length} non-deleted profiles</Text>
        <Table.Root size="sm"><Table.Header><Table.Row>{['ID', 'Profile', 'Email', 'Status', 'Last application', ...(canEditClients ? ['Actions'] : [])].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header><Table.Body>
          {details.profiles.map((profile) => <Table.Row key={profile.id}><Table.Cell fontFamily="mono" color="gray.600">#{profile.id}</Table.Cell><Table.Cell><Link to={`/users/clients/${id}/profiles/${profile.id}`} style={{ color: "#15803d", textDecoration: "underline" }}>{profile.name || `Profile #${profile.id}`}</Link></Table.Cell><Table.Cell>{profile.email || '—'}</Table.Cell><Table.Cell><StatusBadge status={profile.status} /></Table.Cell><Table.Cell>{time(profile.lastApplicationAt)}</Table.Cell>{canEditClients && <Table.Cell><Button size="xs" variant="outline" colorPalette="red" disabled={saving} onClick={() => void deleteProfile(profile)}><Trash2 size={14} />Delete</Button></Table.Cell>}</Table.Row>)}
          {!details.profiles.length && <Table.Row><Table.Cell colSpan={canEditClients ? 6 : 5}>No profiles yet.</Table.Cell></Table.Row>}
        </Table.Body></Table.Root>
      </Box>
      <Box bg="white" borderRadius="2xl" p="5" overflowX="auto">
        <Text fontWeight="bold">Applications ({details.user._count?.applications ?? 0})</Text><Text fontSize="xs" color="gray.500" mb="4">Latest {details.applications.length} applications</Text>
        <Table.Root size="sm" minW="800px"><Table.Header><Table.Row>{['Job', 'Profile', 'Status', 'Created', 'Applied', 'Message'].map((label) => <Table.ColumnHeader key={label}>{label}</Table.ColumnHeader>)}</Table.Row></Table.Header><Table.Body>
          {details.applications.map((application) => <Table.Row key={application.id}><Table.Cell><Text>{application.job?.positionName || `Application #${application.id}`}</Text><Text fontSize="xs" color="gray.500">{application.job?.companyName}</Text></Table.Cell><Table.Cell>{application.profile?.name || (application.profile ? `Profile #${application.profile.id}` : '—')}</Table.Cell><Table.Cell><StatusBadge status={application.status} /></Table.Cell><Table.Cell>{time(application.createdAt)}</Table.Cell><Table.Cell>{time(application.appliedAt)}</Table.Cell><Table.Cell maxW="72" whiteSpace="pre-wrap" overflowWrap="anywhere">{application.message || '—'}</Table.Cell></Table.Row>)}
          {!details.applications.length && <Table.Row><Table.Cell colSpan={6}>No applications yet.</Table.Cell></Table.Row>}
        </Table.Body></Table.Root>
      </Box>
      <UserPaymentHistory key={id} userId={id} />
      {editing && <UserDetailsDialog user={details.user} onClose={() => setEditing(false)} onSaved={(user) => { update(user); setEditing(false); }} />}
      {editingName && <UserNameDialog user={details.user} onClose={() => setEditingName(false)} onSaved={(user) => { update(user); setEditingName(false); }} />}
    </>}
  </Box>;
}
