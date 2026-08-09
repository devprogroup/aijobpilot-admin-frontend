import { Box, Text } from "@chakra-ui/react";
import { CrawlerTypesTable } from "./components/CrawlerTypesTable";

export function CrawlerTypesPage() {
  return (
    <>
      <Box as="header" mb="8">
        <Text
          mb="2"
          fontSize="xs"
          fontWeight="bold"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="#498366"
        >
          Configuration
        </Text>
        <Text
          as="h1"
          m="0"
          fontSize="3xl"
          fontWeight="bold"
          letterSpacing="tight"
        >
          Crawler types
        </Text>
        <Text mt="2" fontSize="sm" color="gray.500">
          Manage crawler type definitions and defaults.
        </Text>
      </Box>
      <CrawlerTypesTable />
    </>
  );
}
