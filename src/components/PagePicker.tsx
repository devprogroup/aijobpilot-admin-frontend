import { NativeSelect } from "@chakra-ui/react";

export function PagePicker({
  page,
  totalPages,
  onChange,
  disabled = false,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  return (
    <NativeSelect.Root w="24" size="sm" disabled={disabled || totalPages <= 1}>
      <NativeSelect.Field
        aria-label="Select page"
        value={page}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <option key={pageNumber} value={pageNumber}>Page {pageNumber}</option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}
