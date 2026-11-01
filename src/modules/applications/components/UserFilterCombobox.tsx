import { useEffect, useMemo, useState } from "react";
import { Combobox, Portal, createListCollection } from "@chakra-ui/react";
import { api } from "../../../api";
import type { ApplicationFilterUser } from "../../../types";

const userLabel = (user: ApplicationFilterUser) => user.name || user.username;

/** The User column filter: type a name, pick from the matches, clear with the X. */
export function UserFilterCombobox({ user, onChange }: { user: ApplicationFilterUser | null; onChange: (user: ApplicationFilterUser | null) => void }) {
  const [input, setInput] = useState("");
  const [users, setUsers] = useState<ApplicationFilterUser[]>([]);
  const selectedLabel = user ? userLabel(user) : "";

  // Clear from outside (the page's Clear button) empties the box too.
  useEffect(() => { setInput(selectedLabel); }, [selectedLabel]);

  // While a user is selected the box shows their name, which isn't a search for other users.
  const search = input === selectedLabel ? "" : input.trim();
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api.applicationFilterUsers(search).then((value) => { if (active) setUsers(value.users); }).catch(() => undefined);
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  const collection = useMemo(() => createListCollection({
    // A selected user can fall outside the current matches; it must stay in the list to stay selected.
    items: user && !users.some((entry) => entry.id === user.id) ? [user, ...users] : users,
    itemToValue: (entry) => String(entry.id),
    itemToString: userLabel,
  }), [users, user]);

  return (
    <Combobox.Root
      size="xs"
      w="28"
      bg="white"
      collection={collection}
      inputValue={input}
      value={user ? [String(user.id)] : []}
      openOnClick
      selectionBehavior="preserve"
      onInputValueChange={({ inputValue }) => {
        setInput(inputValue);
        if (!inputValue && user) onChange(null);
      }}
      onValueChange={({ items }) => onChange((items[0] as ApplicationFilterUser | undefined) ?? null)}
    >
      <Combobox.Control>
        <Combobox.Input aria-label="Filter by user" placeholder="Search user" fontWeight="normal" autoComplete="off" data-1p-ignore data-lpignore="true" data-bwignore="true" />
        <Combobox.IndicatorGroup>
          <Combobox.ClearTrigger aria-label="Clear user filter" onClick={() => { setInput(""); onChange(null); }} />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content minW="80" maxH="64" overflowY="auto">
            <Combobox.Empty px="2" py="1" fontSize="xs">No matching users</Combobox.Empty>
            {collection.items.map((entry) => (
              <Combobox.Item key={entry.id} item={entry} fontSize="xs">
                <Combobox.ItemText>{userLabel(entry)}{entry.email ? ` · ${entry.email}` : ""} #{entry.id}</Combobox.ItemText>
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  );
}
