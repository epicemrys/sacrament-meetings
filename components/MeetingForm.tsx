"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createMeeting, updateMeeting } from "@/lib/actions";
import { meetingTypeLabels, meetingTypes } from "@/lib/meeting-labels";
import {
  initialMeetingFormState,
  type MeetingFieldErrors,
  type MeetingFormState,
  type MeetingFormValues,
  type SpeakerFormValues,
} from "@/lib/meeting-form";

interface ControlProps {
  id: string;
  name: string;
  label: string;
  errors?: string[];
  hint?: string;
  requirement?: "required" | "optional" | "conditional";
}

function describedBy({ id, hint }: ControlProps): string {
  return hint ? `${id}-hint ${id}-error` : `${id}-error`;
}

function FieldShell({ id, label, hint, requirement = "required", errors, children }: ControlProps & { children: ReactNode }): ReactElement {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}{requirement === "optional" && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint && <p id={`${id}-hint`} className="mb-2 text-sm text-muted">{hint}</p>}
      {children}
      <div id={`${id}-error`} aria-live="polite" aria-atomic="true">
        {errors?.map((message) => <p key={message} className="field-error"><span className="sr-only">Error: </span>{message}</p>)}
      </div>
    </div>
  );
}

function TextField(props: ControlProps & { defaultValue: string; type?: "text" | "date" | "url"; inputMode?: "numeric"; autoComplete?: string }): ReactElement {
  const { id, name, errors, requirement = "required", defaultValue, type = "text", inputMode, autoComplete = "off" } = props;
  return (
    <FieldShell {...props}>
      <input id={id} name={name} type={type} inputMode={inputMode} autoComplete={autoComplete} defaultValue={defaultValue}
        aria-required={requirement === "required" ? true : undefined} aria-invalid={errors?.length ? true : undefined} aria-describedby={describedBy(props)}
        className="field-control" />
    </FieldShell>
  );
}

function TextAreaField(props: ControlProps & { defaultValue: string }): ReactElement {
  const { id, name, errors, requirement = "required", defaultValue } = props;
  return (
    <FieldShell {...props}>
      <textarea id={id} name={name} rows={4} defaultValue={defaultValue}
        aria-required={requirement === "required" ? true : undefined} aria-invalid={errors?.length ? true : undefined} aria-describedby={describedBy(props)}
        className="field-control" />
    </FieldShell>
  );
}

function SelectField(props: ControlProps & { defaultValue: string; options: readonly { value: string; label: string }[] }): ReactElement {
  const { id, name, errors, defaultValue, options } = props;
  return (
    <FieldShell {...props}>
      <select id={id} name={name} defaultValue={defaultValue}
        aria-invalid={errors?.length ? true : undefined} aria-describedby={describedBy(props)} className="field-control">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </FieldShell>
  );
}

function HymnFields({ prefix, label, values, errors }: { prefix: "opening" | "sacrament" | "closing"; label: string; values: MeetingFormValues; errors: MeetingFieldErrors }): ReactElement {
  const number = `${prefix}HymnNumber` as const;
  const title = `${prefix}HymnTitle` as const;
  return (
    <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
      <TextField id={number} name={number} label={`${label} number`} inputMode="numeric" defaultValue={values[number]} errors={errors[number]} />
      <TextField id={title} name={title} label={`${label} title`} defaultValue={values[title]} errors={errors[title]} />
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <fieldset className="rounded-2xl border border-line bg-paper p-5 sm:p-7">
      <legend className="px-2 font-display text-xl">{title}</legend>
      <div className="grid gap-5">{children}</div>
    </fieldset>
  );
}

const speakerTypeOptions = [
  { value: "speaker", label: "Speaker" },
  { value: "musical-number", label: "Musical number" },
] as const;

// `source` is the row's position in the last submission, so its errors stay with it after rows are added or removed.
interface SpeakerRow { key: number; source: number | null; values: SpeakerFormValues }

function SpeakerFields({ speakers, errors }: { speakers: SpeakerFormValues[]; errors: MeetingFieldErrors }): ReactElement {
  const [rows, setRows] = useState<SpeakerRow[]>(() => speakers.map((values, index) => ({ key: index, source: index, values })));
  const [nextKey, setNextKey] = useState(speakers.length);
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const addSpeakerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusKey !== null) document.getElementById(`speaker-${focusKey}-name`)?.focus();
  }, [focusKey]);

  function addRow(type: SpeakerFormValues["type"]): void {
    setRows((current) => [...current, { key: nextKey, source: null, values: { type, name: "", topic: "", referenceTitle: "", referenceUrl: "" } }]);
    setFocusKey(nextKey);
    setNextKey(nextKey + 1);
  }

  function removeRow(key: number): void {
    setRows((current) => current.filter((row) => row.key !== key));
    addSpeakerRef.current?.focus();
  }

  const rowErrors = (row: SpeakerRow, field: string): string[] | undefined =>
    row.source === null ? undefined : errors[`speakers.${row.source}.${field}`];

  return (
    <>
      <p className="text-sm text-muted">List speakers and musical numbers in the order they will appear.</p>
      {rows.length === 0 && <p className="rounded-xl bg-canvas p-4 text-sm">No speakers or musical numbers yet. A testimony meeting can leave this empty.</p>}
      {rows.map((row, index) => {
        const id = `speaker-${row.key}`;
        return (
          <fieldset key={row.key} className="rounded-xl border border-line p-4 sm:p-5">
            <legend className="px-2 text-sm font-bold">Programme item {index + 1}</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField id={`${id}-type`} name="speakerType" label="Type" defaultValue={row.values.type} options={speakerTypeOptions} errors={rowErrors(row, "type")} />
              <TextField id={`${id}-name`} name="speakerName" label="Name" defaultValue={row.values.name} errors={rowErrors(row, "name")} />
              <div className="sm:col-span-2">
                <TextField id={`${id}-topic`} name="speakerTopic" label="Topic or selection" hint="Required for speakers. For music, the hymn or song is optional."
                  requirement="conditional" defaultValue={row.values.topic} errors={rowErrors(row, "topic")} />
              </div>
              <TextField id={`${id}-reference-title`} name="speakerReferenceTitle" label="Reference title" requirement="optional" defaultValue={row.values.referenceTitle} errors={rowErrors(row, "referenceTitle")} />
              <TextField id={`${id}-reference-url`} name="speakerReferenceUrl" label="Reference link" type="url" requirement="optional" defaultValue={row.values.referenceUrl} errors={rowErrors(row, "referenceUrl")} />
            </div>
            <button type="button" onClick={() => removeRow(row.key)} className="button-danger mt-4">
              Remove <span className="sr-only">programme item {index + 1}</span>
            </button>
          </fieldset>
        );
      })}
      <div id="speakers-error" aria-live="polite" aria-atomic="true">
        {errors.speakers?.map((message) => <p key={message} className="field-error"><span className="sr-only">Error: </span>{message}</p>)}
      </div>
      <div className="flex flex-wrap gap-3">
        <button ref={addSpeakerRef} type="button" onClick={() => addRow("speaker")} className="button-secondary">Add speaker</button>
        <button type="button" onClick={() => addRow("musical-number")} className="button-secondary">Add musical number</button>
      </div>
    </>
  );
}

interface MeetingFormFieldsProps {
  state: MeetingFormState;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  initialValues: MeetingFormValues;
  submitLabel: string;
}

function MeetingFormFields({ state, formAction, isPending, initialValues, submitLabel }: MeetingFormFieldsProps): ReactElement {
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  // React resets a form after its action runs, so inputs take their defaults from the last submission.
  const values = state.values ?? initialValues;
  const { errors } = state;

  // After a failed save, move focus to the first invalid field, or to the message when no field is at fault.
  useEffect(() => {
    if (!state.message) return;
    const invalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    (invalid ?? messageRef.current)?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-6">
      <p className="text-sm text-muted">All fields are required unless marked optional.</p>
      <div aria-live="polite" aria-atomic="true">
        {state.message && <p ref={messageRef} tabIndex={-1} className="form-message">{state.message}</p>}
      </div>
      <FormSection title="Meeting details">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="date" name="date" label="Date" type="date" hint="Choose a Sunday." defaultValue={values.date} errors={errors.date} />
          <SelectField id="meetingType" name="meetingType" label="Meeting type" defaultValue={values.meetingType} errors={errors.meetingType}
            options={meetingTypes.map((type) => ({ value: type, label: meetingTypeLabels[type] }))} />
          <TextField id="presiding" name="presiding" label="Presiding" defaultValue={values.presiding} errors={errors.presiding} />
          <TextField id="conducting" name="conducting" label="Conducting" defaultValue={values.conducting} errors={errors.conducting} />
        </div>
      </FormSection>
      <FormSection title="Welcome and opening">
        <HymnFields prefix="opening" label="Opening hymn" values={values} errors={errors} />
        <TextField id="openingPrayer" name="openingPrayer" label="Opening prayer" defaultValue={values.openingPrayer} errors={errors.openingPrayer} />
        <TextAreaField id="wardBusiness" name="wardBusiness" label="Ward business" hint="One item per line, such as a release or sustaining." requirement="optional" defaultValue={values.wardBusiness} errors={errors.wardBusiness} />
        <div className="flex items-center gap-3">
          <input id="stakeBusiness" name="stakeBusiness" type="checkbox" defaultChecked={values.stakeBusiness} className="size-6 accent-[#233c39]" />
          <label htmlFor="stakeBusiness" className="text-sm font-semibold">Stake business will be presented</label>
        </div>
      </FormSection>
      <FormSection title="The sacrament">
        <HymnFields prefix="sacrament" label="Sacrament hymn" values={values} errors={errors} />
      </FormSection>
      <FormSection title="Messages and music">
        {/* Remount the rows after each save attempt so they match the submitted values and errors. */}
        <SpeakerFields key={JSON.stringify(values.speakers)} speakers={values.speakers} errors={errors} />
      </FormSection>
      <FormSection title="Closing">
        <HymnFields prefix="closing" label="Closing hymn" values={values} errors={errors} />
        <TextField id="closingPrayer" name="closingPrayer" label="Closing prayer" defaultValue={values.closingPrayer} errors={errors.closingPrayer} />
      </FormSection>
      <FormSection title="Ward announcements">
        <TextAreaField id="announcements" name="announcements" label="Announcements" hint="One announcement per line." requirement="optional" defaultValue={values.announcements} errors={errors.announcements} />
      </FormSection>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className="button-primary disabled:opacity-70">{isPending ? "Saving…" : submitLabel}</button>
        <Link href="/meetings" className="button-secondary">Cancel</Link>
        <p aria-live="polite" className="text-sm text-muted">{isPending ? "Saving the meeting…" : ""}</p>
      </div>
    </form>
  );
}

export function CreateMeetingForm({ initialValues }: { initialValues: MeetingFormValues }): ReactElement {
  const [state, formAction, isPending] = useActionState(createMeeting, initialMeetingFormState);
  return <MeetingFormFields state={state} formAction={formAction} isPending={isPending} initialValues={initialValues} submitLabel="Create meeting" />;
}

export function EditMeetingForm({ meetingId, initialValues }: { meetingId: number; initialValues: MeetingFormValues }): ReactElement {
  const updateMeetingWithId = updateMeeting.bind(null, meetingId);
  const [state, formAction, isPending] = useActionState(updateMeetingWithId, initialMeetingFormState);
  return <MeetingFormFields state={state} formAction={formAction} isPending={isPending} initialValues={initialValues} submitLabel="Save changes" />;
}