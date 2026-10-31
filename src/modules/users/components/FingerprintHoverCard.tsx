import type { ReactNode } from "react";
import { Box, HoverCard, Portal, Text, chakra } from "@chakra-ui/react";
import type { UserLastFingerprint } from "../../../types";

const withUnit = (value: number | null | undefined, unit: string) => (value === null || value === undefined ? null : `${value}${unit}`);

/** Shows every captured signal of a client's latest fingerprint, as label: value, on hover or focus. */
export function FingerprintHoverCard({ fingerprint, children }: { fingerprint: UserLastFingerprint; children: ReactNode }) {
  const { details } = fingerprint;
  const rows: Array<[string, ReactNode]> = [
    ["Fingerprint ID", fingerprint.visitorId],
    ["Stability score", fingerprint.confidence === null ? null : `${Math.round(fingerprint.confidence * 100)}%`],
    ["Browser", fingerprint.browser],
    ["OS", fingerprint.os],
    ["Device", [fingerprint.deviceType, fingerprint.device].filter(Boolean).join(" · ")],
    ["Platform", details.platform],
    ["Graphics", details.gpuRenderer],
    ["Graphics vendor", details.gpuVendor],
    ["Screen", details.screen],
    ["Color depth", withUnit(details.colorDepth, "-bit")],
    ["Pixel ratio", details.pixelRatio],
    ["CPU cores", details.cores],
    ["Memory", withUnit(details.memoryGb, " GB")],
    ["Touch points", details.touchPoints],
    ["Fonts found", details.fontCount],
    ["Timezone", details.timezone],
    ["Locale", details.locale],
    ["Languages", details.languages],
    ["Last IP", fingerprint.ip],
    ["Location", [fingerprint.city, fingerprint.region, fingerprint.country].filter(Boolean).join(", ")],
    ["Sessions", fingerprint.seenCount],
    ["First seen", new Date(fingerprint.firstSeen).toLocaleString()],
    ["Last seen", new Date(fingerprint.at).toLocaleString()],
    ["Fingerprints on account", fingerprint.count],
    ["Other accounts", fingerprint.otherAccounts],
  ];
  return <HoverCard.Root lazyMount unmountOnExit openDelay={150} closeDelay={150} positioning={{ placement: "left-start" }}>
    <HoverCard.Trigger asChild><chakra.div tabIndex={0} cursor="help" minW="0">{children}</chakra.div></HoverCard.Trigger>
    <Portal><HoverCard.Positioner><HoverCard.Content w="400px" maxW="90vw" p="3">
      <Box as="dl" m="0" display="grid" gridTemplateColumns="auto 1fr" columnGap="3" rowGap="0.5" fontSize="xs">
        {rows.map(([label, value]) => <Box key={label} display="contents">
          <Text as="dt" color="gray.500" whiteSpace="nowrap">{label}:</Text>
          <Text as="dd" m="0" wordBreak="break-word">{value === null || value === undefined || value === "" ? "—" : value}</Text>
        </Box>)}
      </Box>
    </HoverCard.Content></HoverCard.Positioner></Portal>
  </HoverCard.Root>;
}
