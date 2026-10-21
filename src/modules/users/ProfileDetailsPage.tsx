import { useEffect, useState, type ReactNode } from "react";
import { Box, Button, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import { Link, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { api } from "../../api";
import type { AdminProfileDetails } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";

const time = (value: string | null) => value ? new Date(value).toLocaleString() : "Not set";
const label = (value: string) => value.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (char) => char.toUpperCase());

function DetailData({ value }: { value: unknown }): ReactNode {
  if (value == null || value === "") return <Text color="gray.500">Not set</Text>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (!value.length) return <Text color="gray.500">None</Text>;
    if (value.every((item) => typeof item === "string" || typeof item === "number")) return <Text whiteSpace="pre-wrap">{value.join(", ")}</Text>;
    return <Box as="ol" pl="5" style={{ listStyle: "decimal" }}>{value.map((item, index) => <Box as="li" key={index} mb="4"><DetailData value={item} /></Box>)}</Box>;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return <Text color="gray.500">Not set</Text>;
    return <Box as="dl" display="grid" gap="3">{entries.map(([key, item]) => <Box key={key}>
      <Text as="dt" fontSize="xs" color="gray.500" fontWeight="semibold" mb="1">{label(key)}</Text>
      <Box as="dd" m="0" whiteSpace="pre-wrap" overflowWrap="anywhere"><DetailData value={item} /></Box>
    </Box>)}</Box>;
  }
  return String(value);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="2xl" p="6">
    <Text as="h2" fontSize="lg" fontWeight="bold" mb="4">{title}</Text>{children}
  </Box>;
}

export function ProfileDetailsPage() {
  const params = useParams();
  const userId = Number(params.userId);
  const profileId = Number(params.profileId);
  const [profile, setProfile] = useState<AdminProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const downloadResume = async () => {
    if (!profile?.resumeFileName || downloading) return;
    setDownloading(true); setError("");
    try {
      const blob = await api.userProfileResume(userId, profileId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = profile.resumeFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to download resume.");
    } finally { setDownloading(false); }
  };
  useEffect(() => {
    let active = true;
    setProfile(null); setLoading(true); setError("");
    if (![userId, profileId].every((id) => Number.isSafeInteger(id) && id > 0)) {
      setError("Invalid user or profile ID."); setLoading(false); return;
    }
    api.userProfile(userId, profileId).then(({ profile }) => { if (active) setProfile(profile); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load profile details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, profileId, revision]);
  return <Box>
    <Link to={`/users/clients/${userId}`} style={{ color: "#15803d", textDecoration: "underline" }}>Back to user details</Link>
    <Flex mt="5" mb="6" justify="space-between" align="center" gap="4">
      <Box><Text as="h1" fontSize="3xl" fontWeight="bold">{profile?.name || `Profile #${params.profileId}`}</Text>
        <Text color="gray.500">User #{params.userId} · Profile #{params.profileId}</Text></Box>
      <Flex gap="2" wrap="wrap">
        {profile?.resumeFileName && <Button variant="outline" loading={downloading} disabled={loading || downloading} onClick={() => void downloadResume()}><Download size={16} />Download resume</Button>}
        <Button variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
      </Flex>
    </Flex>
    {error && <Text role="alert" color="red.600" mb="4">{error}</Text>}
    {loading && <Text role="status">Loading profile details...</Text>}
    {profile && <Box display="grid" gap="5">
      <Section title="Profile information">
        <Box mb="4"><StatusBadge status={profile.status} /></Box>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="5">
          {Object.entries({ name: profile.name, email: profile.email, phone: profile.phone,
            location: profile.location, linkedin: profile.linkedin, dateOfBirth: profile.dateOfBirth,
            resume: profile.resumeFileName ?? "No resume uploaded",
            created: time(profile.createdAt), updated: time(profile.updatedAt),
            lastApplication: time(profile.lastApplicationAt) }).map(([key, value]) => <Box key={key}>
            <Text fontSize="xs" color="gray.500" mb="1">{label(key)}</Text><DetailData value={value} />
          </Box>)}
        </SimpleGrid>
      </Section>
      <Section title="Application settings">
        <DetailData value={{ resumeTailoring: profile.needResumeTailor,
          dailyApplicationLimit: profile.applicationLimit ?? "Unlimited",
          allowedTimeWindowsUtc: profile.applicationTimeWindows?.windows ?? "Any time",
          scheduleTimezone: profile.applicationTimeWindows?.timezone ?? "UTC" }} />
      </Section>
      {([
        ["Resume", profile.resumeData], ["Work authorization", profile.workAuthorization],
        ["Voluntary disclosures", profile.eeo], ["Additional information", profile.additionalInfo],
        ["Application answers", profile.applicationAnswers], ["ATS matching data", profile.atsData],
        ["Saved recommendation filters", profile.savedSearch], ["Saved bot filters", profile.botSearch],
      ] as const).map(([title, value]) => <Section key={title} title={title}><DetailData value={value} /></Section>)}
    </Box>}
  </Box>;
}
