import { useEffect, useState } from "react";
import { Button, Dialog, Flex, Portal, Text } from "@chakra-ui/react";
import { X } from 'lucide-react'
import { api } from "../../../api";
import { StructuredLogViewer } from "../../../components/StructuredLogViewer";

export function ApplicationLogDialog({ applicationId, onClose }: {
  applicationId: number;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.applicationLog(applicationId).then((result) => {
      if (active) setContent(result.content);
    }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "Unable to load log");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [applicationId, revision]);

  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="6xl" mx="4" p="6" borderRadius="2xl">
            <Flex align="center" justify="space-between" gap="4" mb="4" wrap="wrap">
              <Dialog.Title>Application #{applicationId} log</Dialog.Title>
              <Flex gap="2" align="center" flexShrink="0" ml="auto">
                <Button size="sm" variant="outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh</Button>
                <Dialog.CloseTrigger asChild position="static"><Button size="sm" variant="outline" aria-label="Close log dialog"><X /></Button></Dialog.CloseTrigger>
              </Flex>
            </Flex>
            <Dialog.Body p="0">
              {loading ? <Text role="status">Loading log...</Text> : error ? (
                <Text role="alert" color="red.600">{error}</Text>
              ) : (
                <StructuredLogViewer content={content} />
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
