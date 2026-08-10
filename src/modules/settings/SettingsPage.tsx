import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Input,
  Portal,
  Table,
  Text,
} from "@chakra-ui/react";
import { api } from "../../api";
import type { AppConfig } from "../../types";

export function SettingsPage() {
  const [settings, setSettings] = useState<AppConfig[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const load = () =>
    api.settings().then(({ settings: rows }) => {
      setSettings(rows);
      setValues(Object.fromEntries(rows.map((setting) => [setting.key, setting.value])));
    });

  useEffect(() => {
    load().catch((reason) => setError(reason.message));
  }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.createSetting({ key: key.trim(), value: value.trim() });
      setKey("");
      setValue("");
      await load();
      setMessage("Setting created.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create setting");
    }
  };

  const save = async (settingKey: string) => {
    setError("");
    setMessage("");
    try {
      await api.updateSetting(settingKey, values[settingKey] ?? "");
      await load();
      setMessage(`${settingKey} saved.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save setting");
    }
  };

  const remove = async () => {
    if (!deleteKey) return;
    try {
      await api.deleteSetting(deleteKey);
      setDeleteKey(null);
      await load();
      setMessage("Setting deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete setting");
    }
  };

  return (
    <>
      <Box as="header" mb="8">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">
          Configuration
        </Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">App settings</Text>
        <Text mt="2" fontSize="sm" color="gray.500">Manage application-wide configuration values.</Text>
      </Box>

      {(error || message) && (
        <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"}>
          {error || message}
        </Box>
      )}

      <Box as="form" onSubmit={create} mb="6" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" p="5">
        <Text mb="4" fontWeight="bold">Add setting</Text>
        <Flex gap="3" align="end" flexWrap="wrap">
          <Box flex="1" minW="220px">
            <Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Key</Text>
            <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder="Enter config name..." required />
          </Box>
          <Box flex="1" minW="220px">
            <Text mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Value</Text>
            <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Enter value..." required />
          </Box>
          <Button type="submit" bg="green.600" color="white" _hover={{ bg: "green.700" }}>Add setting</Button>
        </Flex>
      </Box>

      <Box overflow="hidden" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white">
        <Table.Root minW="680px" size="sm">
          <Table.Header bg="gray.50">
            <Table.Row>
              <Table.ColumnHeader px="5" py="3">Key</Table.ColumnHeader>
              <Table.ColumnHeader px="5" py="3">Value</Table.ColumnHeader>
              <Table.ColumnHeader px="5" py="3">Updated</Table.ColumnHeader>
              <Table.ColumnHeader px="5" py="3" textAlign="right">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {settings.map((setting) => (
              <Table.Row key={setting.key}>
                <Table.Cell px="5" py="4" fontWeight="semibold">{setting.key}</Table.Cell>
                <Table.Cell px="5" py="4">
                  <Input value={values[setting.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [setting.key]: event.target.value }))} />
                </Table.Cell>
                <Table.Cell px="5" py="4" color="gray.500">{new Date(setting.updatedAt).toLocaleString()}</Table.Cell>
                <Table.Cell px="5" py="4">
                  <Flex justify="flex-end" gap="2">
                    <Button size="sm" onClick={() => save(setting.key)}>Save</Button>
                    <Button size="sm" variant="outline" colorPalette="red" onClick={() => setDeleteKey(setting.key)}>Delete</Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root open={Boolean(deleteKey)} onOpenChange={(details) => !details.open && setDeleteKey(null)}>
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.600" />
          <Dialog.Positioner>
            <Dialog.Content maxW="md" borderRadius="2xl" p="6">
              <Dialog.Title fontSize="lg" fontWeight="bold">Delete setting?</Dialog.Title>
              <Dialog.Description mt="2" color="gray.500">This will permanently remove {deleteKey}.</Dialog.Description>
              <Flex mt="6" justify="flex-end" gap="3">
                <Button variant="outline" onClick={() => setDeleteKey(null)}>Cancel</Button>
                <Button colorPalette="red" onClick={remove}>Delete</Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
