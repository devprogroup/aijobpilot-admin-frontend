import { useState } from "react";
import { Box, Button, Dialog, Field, Flex, Input, NativeSelect, Portal, Textarea } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { api } from "../../../api";
import type { ApplicationSite, ApplicationSitePayload } from "../../../types";

type FormValues = Omit<ApplicationSitePayload, "config"> & { config: string };
const schema = yup.object({
  typeName: yup.string().trim().required("Type name is required"),
  displayText: yup.string().trim().required("Display text is required"),
  domainRegex: yup.string().trim().required("Domain pattern is required").test("regex", "Enter a valid regular expression", (value) => {
    try { new RegExp(value || "", "i"); return true; } catch { return false; }
  }),
  active: yup.boolean().required(),
  newContextRequired: yup.boolean().required(),
  mode: yup.mixed<ApplicationSite["mode"]>().oneOf(["headless", "headed", "chrome-extension"]).required(),
  fieldInputGapMs: yup.number().typeError("Enter a number").integer().min(0).max(2147483647).required("Input gap is required"),
  submitDelayMs: yup.number().typeError("Enter a number").integer().min(0).max(2147483647).required("Submit delay is required"),
  pageTimeout: yup.number().typeError("Enter a number").integer().min(0).max(2147483647).required("Page timeout is required"),
  config: yup.string().required("Config is required").test("json", "Config must be a valid JSON object", (value) => {
    try { const parsed = JSON.parse(value || ""); return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed); } catch { return false; }
  }),
});

export function ApplicationSiteFormModal({ site, onClose, onSaved }: {
  site?: ApplicationSite;
  onClose: () => void;
  onSaved: (site: ApplicationSite) => void;
}) {
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      typeName: site?.typeName ?? "", displayText: site?.displayText ?? "", domainRegex: site?.domainRegex ?? "",
      active: site?.active ?? true, newContextRequired: site?.newContextRequired ?? false,
      mode: site?.mode ?? "headless", fieldInputGapMs: site?.fieldInputGapMs ?? 500,
      submitDelayMs: site?.submitDelayMs ?? 500,
      pageTimeout: site?.pageTimeout ?? 5000,
      config: JSON.stringify(site?.config ?? {}, null, 2),
    },
  });
  const onSubmit = async (values: FormValues) => {
    setError("");
    try {
      const payload = { ...values, config: JSON.parse(values.config) };
      const result = site ? await api.updateApplicationSite(site.id, payload) : await api.createApplicationSite(payload);
      onSaved(result.applicationSite);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save application site"); }
  };

  return (
    <Dialog.Root open scrollBehavior="inside" onOpenChange={({ open }) => { if (!open && !isSubmitting) onClose(); }}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="lg" borderRadius="2xl">
            <Dialog.Header><Dialog.Title>{site ? "Edit application site" : "Add application site"}</Dialog.Title></Dialog.Header>
            <Dialog.Body>
              <Box as="form" id="application-site-form" onSubmit={handleSubmit(onSubmit)}>
                <Flex direction="column" gap="4">
                  {([
                    ["typeName", "Type name"], ["displayText", "Display text"], ["domainRegex", "Domain pattern"],
                  ] as const).map(([name, label]) => (
                    <Field.Root key={name} invalid={!!errors[name]}>
                      <Field.Label>{label}</Field.Label>
                      <Input {...register(name)} disabled={isSubmitting} />
                      {name === "domainRegex" && <Field.HelperText>Regular expression matched against the hostname, ignoring case.</Field.HelperText>}
                      <Field.ErrorText>{errors[name]?.message}</Field.ErrorText>
                    </Field.Root>
                  ))}
                  <Field.Root invalid={!!errors.mode}>
                    <Field.Label>Execution mode</Field.Label>
                    <NativeSelect.Root disabled={isSubmitting}><NativeSelect.Field {...register("mode")}>
                      <option value="headless">Headless</option><option value="headed">Headed</option><option value="chrome-extension">Chrome extension</option>
                    </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                    <Field.ErrorText>{errors.mode?.message}</Field.ErrorText>
                  </Field.Root>
                  <Field.Root invalid={!!errors.fieldInputGapMs}>
                    <Field.Label>Field input gap (ms)</Field.Label>
                    <Input type="number" min={0} max={2147483647} step={1} {...register("fieldInputGapMs")} disabled={isSubmitting} />
                    <Field.ErrorText>{errors.fieldInputGapMs?.message}</Field.ErrorText>
                  </Field.Root>
                  <Field.Root invalid={!!errors.submitDelayMs}>
                    <Field.Label>Submit delay (ms)</Field.Label>
                    <Input type="number" min={0} max={2147483647} step={1} {...register("submitDelayMs")} disabled={isSubmitting} />
                    <Field.ErrorText>{errors.submitDelayMs?.message}</Field.ErrorText>
                  </Field.Root>
                  <Field.Root invalid={!!errors.pageTimeout}>
                    <Field.Label>Page timeout (ms)</Field.Label>
                    <Input type="number" min={0} max={2147483647} step={1} {...register("pageTimeout")} disabled={isSubmitting} />
                    <Field.ErrorText>{errors.pageTimeout?.message}</Field.ErrorText>
                  </Field.Root>
                  <Box as="label" display="flex" gap="2" alignItems="center"><input type="checkbox" {...register("active")} disabled={isSubmitting} />Active</Box>
                  <Box as="label" display="flex" gap="2" alignItems="center"><input type="checkbox" {...register("newContextRequired")} disabled={isSubmitting} />Require a new browser context</Box>
                  <Field.Root invalid={!!errors.config}>
                    <Field.Label>Config (JSON)</Field.Label>
                    <Textarea rows={5} fontFamily="mono" {...register("config")} disabled={isSubmitting} />
                    <Field.ErrorText>{errors.config?.message}</Field.ErrorText>
                  </Field.Root>
                  {error && <Box role="alert" bg="red.50" color="red.700" p="3" borderRadius="xl">{error}</Box>}
                </Flex>
              </Box>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button form="application-site-form" type="submit" disabled={isSubmitting} bg="green.600" color="white" _hover={{ bg: "green.700" }}>{isSubmitting ? "Saving..." : "Save"}</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
