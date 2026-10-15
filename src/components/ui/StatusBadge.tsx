import { Badge, Box } from "@chakra-ui/react";

const PALETTE: Record<string, string> = {
  running: "blue",
  queued: "orange",
  scheduled: "blue",
  cooling: "orange",
  ready: "green",
  started: "blue",
  applying: "blue",
  applied: "green",
  idle: "gray",
  active: "green",
  inactive: "gray",
  suspended: "red",
  finished: "green",
  credited: "green",
  detected: "orange",
  pending: "orange",
  failed: "red",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      colorPalette={PALETTE[status] ?? "gray"}
      variant="subtle"
      borderRadius="full"
      px="2.5"
      py="1"
      textTransform="capitalize"
      display="inline-flex"
      alignItems="center"
      gap="1.5"
    >
      <Box as="span" h="1.5" w="1.5" borderRadius="full" bg="currentColor" />
      {status}
    </Badge>
  );
}
