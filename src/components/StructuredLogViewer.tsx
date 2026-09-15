import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  NativeSelect,
  Text,
} from "@chakra-ui/react";

type Entry = {
  line: number;
  raw: string;
  level: string;
  event: string;
  service: string;
  timestamp: string;
  details: Record<string, unknown>;
};
function parse(content: string): Entry[] {
  return content.split(/\r?\n/).flatMap((raw, index) => {
    if (!raw.trim()) return [];
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error();
      const { ts, level, event, service, ...details } = value;
      if (typeof event !== "string" || typeof level !== "string")
        throw new Error();
      return [
        {
          line: index + 1,
          raw,
          level: level.toLowerCase(),
          event,
          service: typeof service === "string" ? service : "",
          timestamp: typeof ts === "string" ? ts : "",
          details,
        },
      ];
    } catch {
      return [
        {
          line: index + 1,
          raw,
          level: "text",
          event: raw,
          service: "",
          timestamp: "",
          details: {},
        },
      ];
    }
  });
}
function timestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
const readable = (value: string) =>
  value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());

export function StructuredLogViewer({ content }: { content: string }) {
  const entries = useMemo(() => parse(content), [content]);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [raw, setRaw] = useState(false);
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      entries.filter(
        (entry) =>
          (!level || entry.level === level) &&
          entry.raw.toLowerCase().includes(query.toLowerCase()),
      ),
    [entries, query, level],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 100));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 100, currentPage * 100);
  return (
    <Box>
      <Flex gap="2" wrap="wrap" mb="3" align="center">
        <Input
          flex="1"
          minW="40"
          aria-label="Search log entries"
          placeholder="Search events, messages or details"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <NativeSelect.Root w="40">
          <NativeSelect.Field
            aria-label="Filter log level"
            value={level}
            onChange={(event) => {
              setLevel(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All levels</option>
            {[...new Set(entries.map((entry) => entry.level))]
              .sort()
              .map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Button
          size="sm"
          variant="outline"
          aria-pressed={raw}
          onClick={() => setRaw(!raw)}
        >
          {raw ? "Formatted view" : "Raw view"}
        </Button>
      </Flex>
      <Flex gap="3" mb="3" wrap="wrap" fontSize="xs" color="gray.500">
        <Text>
          {filtered.length} of {entries.length} entries
        </Text>
        <Text>
          {entries.filter((entry) => entry.level === "error").length} errors
        </Text>
        <Text>
          {entries.filter((entry) => entry.level === "warn").length} warnings
        </Text>
        <Text>Times shown in your local timezone</Text>
      </Flex>
      <Box
        maxH="55vh"
        overflow="auto"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="lg"
      >
        {!visible.length ? (
          <Text p="6">
            {entries.length
              ? "No matching log entries."
              : "This log file is empty."}
          </Text>
        ) : raw ? (
          <Box
            as="pre"
            m="0"
            p="4"
            bg="gray.950"
            color="gray.100"
            fontSize="xs"
            whiteSpace="pre-wrap"
            overflowWrap="anywhere"
          >
            {visible.map((entry) => entry.raw).join("\n")}
          </Box>
        ) : (
          visible.map((entry) => {
            const palette =
              entry.level === "error"
                ? "red"
                : entry.level === "warn"
                  ? "orange"
                  : entry.level === "info"
                    ? "blue"
                    : "gray";
            return (
              <Box
                key={entry.line}
                p="4"
                borderBottom="1px solid"
                borderColor="gray.100"
                borderLeft="3px solid"
                borderLeftColor={`${palette}.400`}
              >
                <Flex
                  gap="3"
                  align="center"
                  whiteSpace="nowrap"
                  overflowX="auto"
                >
                  <Text
                    flexShrink="0"
                    fontSize="xs"
                    color="gray.500"
                    title={entry.timestamp}
                  >
                    {timestamp(entry.timestamp)}
                  </Text>
                  <Badge flexShrink="0" colorPalette={palette}>
                    {entry.level}
                  </Badge>
                  <Text
                    flexShrink="0"
                    fontWeight="semibold"
                    title={entry.event}
                  >
                    {entry.level === "text"
                      ? entry.event
                      : readable(entry.event)}
                  </Text>
                  {entry.service && (
                    <Text flexShrink="0" fontSize="xs" color="gray.500">
                      {entry.service}
                    </Text>
                  )}
                  <Text flexShrink="0" fontSize="xs" color="gray.400" ml="auto">
                    Line {entry.line}
                  </Text>
                </Flex>
                {Object.keys(entry.details).length > 0 && (
                  <Flex
                    mt="2"
                    gap="2"
                    wrap="wrap"
                    fontSize="sm"
                    align="flex-start"
                  >
                    {Object.entries(entry.details).map(([key, value]) => (
                      <Box
                        key={key}
                        maxW="full"
                        color={key === "error" ? "red.600" : "gray.600"}
                        whiteSpace="pre-wrap"
                        overflowWrap="anywhere"
                      >
                        <Text as="span" fontWeight="semibold">
                          {readable(key)}:{" "}
                        </Text>
                        <Text
                          as="span"
                          fontFamily={
                            typeof value === "object" ? "mono" : undefined
                          }
                        >
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </Text>
                      </Box>
                    ))}
                  </Flex>
                )}
              </Box>
            );
          })
        )}
      </Box>
      {pages > 1 && (
        <Flex mt="3" align="center" justify="space-between">
          <Text fontSize="xs">
            Page {currentPage} of {pages}
          </Text>
          <Flex gap="2">
            <Button
              size="xs"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </Flex>
        </Flex>
      )}
    </Box>
  );
}
