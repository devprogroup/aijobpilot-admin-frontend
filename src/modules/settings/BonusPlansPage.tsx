import { useEffect, useState } from "react";
import { Box, Button, chakra, Dialog, Flex, Input, Portal, Table, Text } from "@chakra-ui/react";
import { api } from "../../api";
import type { BonusPlan, BonusPlanPayload } from "../../types";

type Draft = { minTopup: string; bonusRate: string; active: boolean };

const emptyDraft: Draft = { minTopup: "", bonusRate: "", active: true };
const toDraft = (plan: BonusPlan): Draft => ({ minTopup: String(plan.minTopup), bonusRate: String(plan.bonusRate), active: plan.active });
const formatAmount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Validates a draft; returns the payload or a message describing the problem. */
function toPayload(draft: Draft): BonusPlanPayload | string {
  const minTopup = Number(draft.minTopup);
  const bonusRate = Number(draft.bonusRate);
  if (draft.minTopup.trim() === "" || !Number.isFinite(minTopup) || minTopup < 0) return "Minimum top-up must be a number of 0 or more.";
  if (draft.bonusRate.trim() === "" || !Number.isFinite(bonusRate) || bonusRate < 1 || bonusRate > 100) {
    return "Bonus rate must be between 1 and 100 (1.10 credits 10% extra).";
  }
  return { minTopup, bonusRate, active: draft.active };
}

/** "+10% · 100 USDT → 110 credit" for a valid draft, otherwise nothing. */
function BonusPreview({ draft }: { draft: Draft }) {
  const payload = toPayload(draft);
  if (typeof payload === "string") return <Text fontSize="xs" color="gray.400">—</Text>;
  const percent = Number(((payload.bonusRate - 1) * 100).toFixed(2));
  return (
    <Box fontSize="xs">
      <Text fontWeight="semibold" color={percent > 0 ? "green.700" : "gray.500"}>{percent > 0 ? `+${percent}%` : "No bonus"}</Text>
      <Text color="gray.500">{formatAmount(payload.minTopup)} USDT → {formatAmount(payload.minTopup * payload.bonusRate)} credit</Text>
    </Box>
  );
}

/** Settings > Bonus plans: top-up bonus tiers credited when a deposit is confirmed. */
export function BonusPlansPage() {
  const [plans, setPlans] = useState<BonusPlan[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [newPlan, setNewPlan] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BonusPlan | null>(null);

  const load = () =>
    api.bonusPlans().then(({ bonusPlans }) => {
      setPlans(bonusPlans);
      setDrafts(Object.fromEntries(bonusPlans.map((plan) => [plan.id, toDraft(plan)])));
    });

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load bonus plans"));
  }, []);

  const notify = (text: string, isError = false) => {
    setError(isError ? text : "");
    setMessage(isError ? "" : text);
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = toPayload(newPlan);
    if (typeof payload === "string") return notify(payload, true);
    try {
      await api.createBonusPlan(payload);
      setNewPlan(emptyDraft);
      await load();
      notify("Bonus plan added.");
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Unable to add bonus plan", true);
    }
  };

  const save = async (plan: BonusPlan) => {
    const payload = toPayload(drafts[plan.id] ?? toDraft(plan));
    if (typeof payload === "string") return notify(payload, true);
    try {
      await api.updateBonusPlan(plan.id, payload);
      await load();
      notify(`Bonus plan for ${formatAmount(payload.minTopup)} USDT saved.`);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Unable to save bonus plan", true);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteBonusPlan(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      notify("Bonus plan deleted.");
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Unable to delete bonus plan", true);
    }
  };

  const updateDraft = (id: number, change: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? emptyDraft), ...change } }));

  return (
    <>
      <Box as="header" mb="8">
        <Text mb="2" fontSize="xs" fontWeight="bold" letterSpacing="0.18em" textTransform="uppercase" color="#498366">
          Settings
        </Text>
        <Text as="h1" m="0" fontSize="3xl" fontWeight="bold" letterSpacing="tight">Bonus plans</Text>
        <Text mt="2" fontSize="sm" color="gray.500">
          A confirmed top-up of at least the minimum amount is credited at amount × bonus rate. When several active plans
          qualify, the one with the highest minimum applies. Clients see active plans when choosing a top-up network.
        </Text>
      </Box>

      {(error || message) && (
        <Box mb="5" borderRadius="xl" bg={error ? "red.50" : "green.50"} p="4" fontSize="sm" color={error ? "red.700" : "green.700"} role={error ? "alert" : "status"}>
          {error || message}
        </Box>
      )}

      <Box as="form" onSubmit={create} mb="6" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white" p="5">
        <Text mb="4" fontWeight="bold">Add bonus plan</Text>
        <Flex gap="3" align="end" flexWrap="wrap">
          <Box flex="1" minW="180px">
            <chakra.label htmlFor="new-min-topup" display="block" mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Minimum top-up (USDT)</chakra.label>
            <Input id="new-min-topup" type="number" min="0" step="any" value={newPlan.minTopup} onChange={(event) => setNewPlan((current) => ({ ...current, minTopup: event.target.value }))} placeholder="100" required />
          </Box>
          <Box flex="1" minW="180px">
            <chakra.label htmlFor="new-bonus-rate" display="block" mb="1" fontSize="xs" fontWeight="semibold" color="gray.500">Bonus rate</chakra.label>
            <Input id="new-bonus-rate" type="number" min="1" max="100" step="any" value={newPlan.bonusRate} onChange={(event) => setNewPlan((current) => ({ ...current, bonusRate: event.target.value }))} placeholder="1.10" required />
          </Box>
          <Box minW="160px" pb="1"><BonusPreview draft={newPlan} /></Box>
          <Box as="label" display="flex" gap="2" alignItems="center" fontSize="sm" pb="2">
            <input type="checkbox" checked={newPlan.active} onChange={(event) => setNewPlan((current) => ({ ...current, active: event.target.checked }))} /> Active
          </Box>
          <Button type="submit" bg="green.600" color="white" _hover={{ bg: "green.700" }}>Add plan</Button>
        </Flex>
      </Box>

      <Box overflowX="auto" borderRadius="2xl" border="1px solid" borderColor="gray.200" bg="white">
        <Table.Root minW="760px" size="sm">
          <Table.Header bg="gray.50">
            <Table.Row>
              <Table.ColumnHeader px="5" py="3">Minimum top-up (USDT)</Table.ColumnHeader>
              <Table.ColumnHeader px="5" py="3">Bonus rate</Table.ColumnHeader>
              <Table.ColumnHeader px="5" py="3">Bonus</Table.ColumnHeader>
              <Table.ColumnHeader px="5" py="3">Active</Table.ColumnHeader>
              <Table.ColumnHeader px="5" py="3">Updated</Table.ColumnHeader>
              <Table.ColumnHeader px="5" py="3" textAlign="right">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {plans.length === 0 && (
              <Table.Row>
                <Table.Cell px="5" py="6" colSpan={6} color="gray.500" textAlign="center">
                  No bonus plans yet. Top-ups are credited 1:1 until you add one.
                </Table.Cell>
              </Table.Row>
            )}
            {plans.map((plan) => {
              const draft = drafts[plan.id] ?? toDraft(plan);
              return (
                <Table.Row key={plan.id}>
                  <Table.Cell px="5" py="4">
                    <Input aria-label="Minimum top-up (USDT)" type="number" min="0" step="any" value={draft.minTopup} onChange={(event) => updateDraft(plan.id, { minTopup: event.target.value })} />
                  </Table.Cell>
                  <Table.Cell px="5" py="4">
                    <Input aria-label="Bonus rate" type="number" min="1" max="100" step="any" value={draft.bonusRate} onChange={(event) => updateDraft(plan.id, { bonusRate: event.target.value })} />
                  </Table.Cell>
                  <Table.Cell px="5" py="4"><BonusPreview draft={draft} /></Table.Cell>
                  <Table.Cell px="5" py="4">
                    <input type="checkbox" aria-label="Active" checked={draft.active} onChange={(event) => updateDraft(plan.id, { active: event.target.checked })} />
                  </Table.Cell>
                  <Table.Cell px="5" py="4" color="gray.500">{new Date(plan.updatedAt).toLocaleString()}</Table.Cell>
                  <Table.Cell px="5" py="4">
                    <Flex justify="flex-end" gap="2">
                      <Button size="sm" onClick={() => save(plan)}>Save</Button>
                      <Button size="sm" variant="outline" colorPalette="red" onClick={() => setDeleteTarget(plan)}>Delete</Button>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>

      <Dialog.Root open={Boolean(deleteTarget)} onOpenChange={(details) => !details.open && setDeleteTarget(null)}>
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.600" />
          <Dialog.Positioner>
            <Dialog.Content maxW="md" borderRadius="2xl" p="6">
              <Dialog.Title fontSize="lg" fontWeight="bold">Delete bonus plan?</Dialog.Title>
              <Dialog.Description mt="2" color="gray.500">
                Top-ups of {deleteTarget ? formatAmount(deleteTarget.minTopup) : ""} USDT or more will no longer get this bonus.
                Bonuses already credited are not affected. To pause it instead, untick Active.
              </Dialog.Description>
              <Flex mt="6" justify="flex-end" gap="3">
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button colorPalette="red" onClick={remove}>Delete</Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
