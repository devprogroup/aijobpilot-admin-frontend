import { useEffect, useMemo, useState } from "react";
import { DatePicker, Flex, Icon, Portal, Text, parseDate, type DateValue } from "@chakra-ui/react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

const currentYear = new Date().getFullYear();

/** 2026-11-01 -> 11/1, with the year only when it isn't this year. */
function shortDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return year === currentYear ? `${month}/${day}` : `${month}/${day}/${String(year).slice(-2)}`;
}

function Header() {
  return (
    <DatePicker.ViewControl>
      <DatePicker.PrevTrigger aria-label="Previous"><ChevronLeft size={16} /></DatePicker.PrevTrigger>
      <DatePicker.ViewTrigger><DatePicker.RangeText /></DatePicker.ViewTrigger>
      <DatePicker.NextTrigger aria-label="Next"><ChevronRight size={16} /></DatePicker.NextTrigger>
    </DatePicker.ViewControl>
  );
}

/**
 * One date range filter: a compact button that opens a calendar, first click the start, second the
 * end (the same day twice for one day). from and to are YYYY-MM-DD, or both empty for all dates.
 */
export function DateRangeFilter({ label, from, to, onChange }: { label: string; from: string; to: string; onChange: (from: string, to: string) => void }) {
  const committed = useMemo<DateValue[]>(() => (from && to ? [parseDate(from), parseDate(to)] : []), [from, to]);
  // Holds the half-picked range, so the table only reloads once the range is complete.
  const [draft, setDraft] = useState<DateValue[]>(committed);
  useEffect(() => { setDraft(committed); }, [committed]);
  const text = from && to ? `${shortDate(from)} – ${shortDate(to)}` : "All dates";

  return (
    <DatePicker.Root
      selectionMode="range"
      size="sm"
      w="32"
      value={draft}
      onValueChange={({ value }) => {
        setDraft(value);
        if (value.length === 2) onChange(value[0].toString(), value[1].toString());
        else if (value.length === 0) onChange("", "");
      }}
      onOpenChange={({ open }) => { if (!open) setDraft(committed); }}
    >
      <DatePicker.Control>
        <Flex align="center" h="8" w="full" border="1px solid" borderColor="border" borderRadius="sm" bg="white">
          <DatePicker.Trigger asChild unstyled>
            <Flex as="button" aria-label={`${label}: ${text}`} title={`${label}: ${from && to ? `${from} to ${to}` : "all dates"}`} align="center" gap="1.5" flex="1" minW="0" h="full" ps="2" cursor="pointer" fontWeight="normal" textAlign="left">
              <Icon as={Calendar} boxSize="3.5" flexShrink={0} color="gray.500" />
              <Text as="span" truncate color={from && to ? undefined : "gray.500"}>{text}</Text>
            </Flex>
          </DatePicker.Trigger>
          {from && to && <DatePicker.ClearTrigger unstyled asChild>
            <Flex as="button" aria-label={`Clear ${label.toLowerCase()} dates`} align="center" justify="center" flexShrink={0} h="full" w="6" cursor="pointer" color="gray.500" _hover={{ color: "gray.800" }}><X size={13} /></Flex>
          </DatePicker.ClearTrigger>}
        </Flex>
      </DatePicker.Control>
      <Portal>
        <DatePicker.Positioner>
          <DatePicker.Content>
            <DatePicker.View view="day"><Header /><DatePicker.DayTable /></DatePicker.View>
            <DatePicker.View view="month"><Header /><DatePicker.MonthTable /></DatePicker.View>
            <DatePicker.View view="year"><Header /><DatePicker.YearTable /></DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </Portal>
    </DatePicker.Root>
  );
}
