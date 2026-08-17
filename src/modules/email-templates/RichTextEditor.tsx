import { useEffect, useRef } from "react";
import { Box, Button, Flex } from "@chakra-ui/react";

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = value;
  }, [value]);

  const command = (name: string, argument?: string) => {
    editor.current?.focus();
    document.execCommand(name, false, argument);
    onChange(editor.current?.innerHTML ?? "");
  };

  const addLink = () => {
    const url = window.prompt("Enter link URL");
    if (url) command("createLink", url);
  };

  const paste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const content = event.clipboardData.getData("text/plain");
    if (!/<[a-z][\s\S]*>/i.test(content)) return;
    event.preventDefault();
    const html = content.replace(/\r\n/g, "\n").replace(/\n/g, "<br>");
    document.execCommand("insertHTML", false, html);
    onChange(editor.current?.innerHTML ?? "");
  };

  return (
    <Box overflow="hidden" border="1px solid" borderColor="gray.200" borderRadius="md" _focusWithin={{ borderColor: "green.500", boxShadow: "0 0 0 1px var(--chakra-colors-green-500)" }}>
      <Flex gap="1" flexWrap="wrap" p="2" bg="gray.50" borderBottom="1px solid" borderColor="gray.200">
        <Button type="button" size="xs" variant="ghost" fontWeight="bold" onMouseDown={(event) => event.preventDefault()} onClick={() => command("bold")}>B</Button>
        <Button type="button" size="xs" variant="ghost" fontStyle="italic" onMouseDown={(event) => event.preventDefault()} onClick={() => command("italic")}>I</Button>
        <Button type="button" size="xs" variant="ghost" textDecoration="underline" onMouseDown={(event) => event.preventDefault()} onClick={() => command("underline")}>U</Button>
        <Button type="button" size="xs" variant="ghost" onMouseDown={(event) => event.preventDefault()} onClick={() => command("formatBlock", "h2")}>Heading</Button>
        <Button type="button" size="xs" variant="ghost" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertUnorderedList")}>Bullets</Button>
        <Button type="button" size="xs" variant="ghost" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertOrderedList")}>Numbering</Button>
        <Button type="button" size="xs" variant="ghost" onMouseDown={(event) => event.preventDefault()} onClick={addLink}>Link</Button>
        <Button type="button" size="xs" variant="ghost" onMouseDown={(event) => event.preventDefault()} onClick={() => command("removeFormat")}>Clear format</Button>
      </Flex>
      <Box
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        minH="220px"
        p="4"
        bg="white"
        lineHeight="1.6"
        whiteSpace="normal"
        outline="none"
        onPaste={paste}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </Box>
  );
}
