import { Flex, Text } from "@chakra-ui/react";

export function UserStats({ stats }: { stats: Array<[string, number]> }) {
  return (
    <Flex as="dl" m="0" gap="5" wrap="wrap">
      {stats.map(([label, value]) => (
        <Flex key={label} align="baseline" gap="1.5">
          <Text as="dd" m="0" order={1} fontSize="sm" fontWeight="bold" fontVariantNumeric="tabular-nums">{value.toLocaleString()}</Text>
          <Text as="dt" order={2} fontSize="xs" color="gray.500">{label}</Text>
        </Flex>
      ))}
    </Flex>
  );
}
