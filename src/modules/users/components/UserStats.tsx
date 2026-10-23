import { Box, SimpleGrid, Text } from "@chakra-ui/react";

export function UserStats({ stats }: { stats: Array<[string, number]> }) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: stats.length }} gap="4" mb="6">
      {stats.map(([label, value]) => (
        <Box
          key={label}
          borderRadius="2xl"
          border="1px solid"
          borderColor="gray.200"
          bg="white"
          p="5"
          boxShadow="0 12px 35px rgba(24, 43, 34, .07)"
        >
          <Text
            fontSize="xs"
            fontWeight="semibold"
            letterSpacing="wider"
            textTransform="uppercase"
            color="gray.400"
          >
            {label}
          </Text>
          <Text mt="2" fontSize="3xl" fontWeight="bold">
            {value}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}
