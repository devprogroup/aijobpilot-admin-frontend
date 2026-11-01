import { useState, type ReactElement } from "react";
import { Box, Flex, Image, Portal, Tooltip } from "@chakra-ui/react";
import { companyLogoUrl } from "../../../api";

/** A quick hover label; the trigger must be one element that takes a ref. */
export function Hint({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip.Root openDelay={100} closeDelay={0} positioning={{ placement: "top" }}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content fontSize="xs">{label}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

const AVATAR_COLORS = [
  { bg: "#dcfce7", color: "#166534" },
  { bg: "#dbeafe", color: "#1e40af" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#fce7f3", color: "#9d174d" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#cffafe", color: "#155e75" },
];

/** The same company always gets the same color. */
function avatarColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** The company's logo, or its first letter when it has none or the image fails to load. */
export function CompanyLogo({ name, logo }: { name: string | null | undefined; logo: string | null | undefined }) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const companyName = name?.trim() || "";
  const src = logo && logo !== failedLogo ? (/^https?:\/\//i.test(logo) ? logo : companyLogoUrl(logo)) : null;
  const colors = avatarColor(companyName);
  return (
    <Hint label={companyName || "Unknown company"}>
      <Box as="span" display="inline-flex" boxSize="7" flexShrink={0} borderRadius="md" overflow="hidden" border="1px solid" borderColor="gray.200" bg="white" verticalAlign="middle">
        {src
          ? <Image src={src} alt={`${companyName} logo`} loading="lazy" boxSize="full" objectFit="contain" onError={() => setFailedLogo(logo ?? null)} />
          : <Flex boxSize="full" align="center" justify="center" fontSize="xs" fontWeight="bold" bg={colors.bg} color={colors.color}>{companyName.charAt(0).toUpperCase() || "?"}</Flex>}
      </Box>
    </Hint>
  );
}
