"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireLeader } from "@/lib/session";
import { isValidDate, parseMeetingId } from "./dates";
import { meetingTypes } from "./meeting-labels";
import type { MeetingFieldErrors, MeetingFormState, MeetingFormValues } from "./meeting-form";
import {
  addMeeting,
  deleteMeeting as deleteMeetingRecord,
  MeetingDateTakenError,
  updateMeeting as updateMeetingRecord,
} from "./meetings-db";
import type { SacramentMeeting } from "./types";

const MAX_LIST_ITEMS = 20;
const MAX_SPEAKERS = 12;

function requiredText(message: string, max = 100) {
  return z.string().trim().min(1, message).max(max, `Use ${max} characters or fewer.`);
}

function optionalText(max: number) {
  return z.string().trim().max(max, `Use ${max} characters or fewer.`);
}

function hymnNumber(hymn: string) {
  return z.string().trim()
    .min(1, { error: `Enter the ${hymn} number.`, abort: true })
    .regex(/^[1-9]\d{0,3}$/, `Enter the ${hymn} number as a whole number from 1 to 9999.`)
    .transform(Number);
}

function lineList(item: string) {
  return z.string()
    .transform((value) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(200, `Keep each ${item} to 200 characters or fewer.`))
      .max(MAX_LIST_ITEMS, `Add no more than ${MAX_LIST_ITEMS} ${item}s.`));
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const SpeakerSchema = z.object({
  type: z.enum(["speaker", "musical-number"], { error: "Choose speaker or musical number." }),
  name: requiredText("Enter the name of the speaker or performers."),
  topic: optionalText(150),
  referenceTitle: optionalText(150),
  referenceUrl: optionalText(500),
}).superRefine((speaker, context) => {
  if (speaker.type === "speaker" && !speaker.topic) {
    context.addIssue({ code: "custom", path: ["topic"], message: "Enter the speaker's topic." });
  }
  if (speaker.referenceUrl && !isHttpsUrl(speaker.referenceUrl)) {
    context.addIssue({ code: "custom", path: ["referenceUrl"], message: "Enter a full link that starts with https://." });
  }
  if (speaker.referenceUrl && !speaker.referenceTitle) {
    context.addIssue({ code: "custom", path: ["referenceTitle"], message: "Enter a title for this link." });
  }
  if (speaker.referenceTitle && !speaker.referenceUrl) {
    context.addIssue({ code: "custom", path: ["referenceUrl"], message: "Enter the link for this reference." });
  }
});

const MeetingFormSchema = z.object({
  date: z.string().trim().superRefine((date, context) => {
    if (!date) context.addIssue({ code: "custom", message: "Enter the meeting date." });
    else if (!isValidDate(date)) context.addIssue({ code: "custom", message: "Enter a real date in YYYY-MM-DD format." });
    else if (new Date(`${date}T12:00:00Z`).getUTCDay() !== 0) {
      context.addIssue({ code: "custom", message: "Sacrament meetings are held on Sunday. Choose a Sunday." });
    }
  }),
  meetingType: z.enum(meetingTypes, { error: "Choose a meeting type." }),
  presiding: requiredText("Enter who is presiding."),
  conducting: requiredText("Enter who is conducting."),
  openingHymnNumber: hymnNumber("opening hymn"),
  openingHymnTitle: requiredText("Enter the opening hymn title.", 150),
  openingPrayer: requiredText("Enter who will give the opening prayer."),
  wardBusiness: lineList("ward business item"),
  stakeBusiness: z.boolean(),
  sacramentHymnNumber: hymnNumber("sacrament hymn"),
  sacramentHymnTitle: requiredText("Enter the sacrament hymn title.", 150),
  speakers: z.array(SpeakerSchema).max(MAX_SPEAKERS, `Add no more than ${MAX_SPEAKERS} speakers and musical numbers.`),
  closingHymnNumber: hymnNumber("closing hymn"),
  closingHymnTitle: requiredText("Enter the closing hymn title.", 150),
  closingPrayer: requiredText("Enter who will give the closing prayer."),
  announcements: lineList("announcement"),
});

type MeetingFormData = z.output<typeof MeetingFormSchema>;

function readMeetingForm(formData: FormData): MeetingFormValues {
  const text = (name: string): string => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const all = (name: string): string[] =>
    formData.getAll(name).map((value) => (typeof value === "string" ? value : ""));
  const types = all("speakerType");
  const topics = all("speakerTopic");
  const referenceTitles = all("speakerReferenceTitle");
  const referenceUrls = all("speakerReferenceUrl");
  return {
    date: text("date"),
    meetingType: text("meetingType"),
    presiding: text("presiding"),
    conducting: text("conducting"),
    openingHymnNumber: text("openingHymnNumber"),
    openingHymnTitle: text("openingHymnTitle"),
    openingPrayer: text("openingPrayer"),
    wardBusiness: text("wardBusiness"),
    stakeBusiness: formData.get("stakeBusiness") === "on",
    sacramentHymnNumber: text("sacramentHymnNumber"),
    sacramentHymnTitle: text("sacramentHymnTitle"),
    speakers: all("speakerName").map((name, index) => ({
      type: types[index] ?? "",
      name,
      topic: topics[index] ?? "",
      referenceTitle: referenceTitles[index] ?? "",
      referenceUrl: referenceUrls[index] ?? "",
    })),
    closingHymnNumber: text("closingHymnNumber"),
    closingHymnTitle: text("closingHymnTitle"),
    closingPrayer: text("closingPrayer"),
    announcements: text("announcements"),
  };
}

function toMeetingRecord(data: MeetingFormData): Omit<SacramentMeeting, "id"> {
  return {
    date: data.date,
    meetingType: data.meetingType,
    presiding: data.presiding,
    conducting: data.conducting,
    announcements: data.announcements,
    openingHymn: { number: data.openingHymnNumber, title: data.openingHymnTitle },
    openingPrayer: data.openingPrayer,
    wardBusiness: data.wardBusiness.map((description) => ({ description })),
    stakeBusiness: data.stakeBusiness,
    sacramentHymn: { number: data.sacramentHymnNumber, title: data.sacramentHymnTitle },
    speakers: data.speakers.map(({ type, name, topic, referenceTitle, referenceUrl }) => ({
      type, name, topic,
      ...(referenceUrl ? { reference: { title: referenceTitle, url: referenceUrl } } : {}),
    })),
    closingHymn: { number: data.closingHymnNumber, title: data.closingHymnTitle },
    closingPrayer: data.closingPrayer,
  };
}

function toFieldErrors(error: z.ZodError): MeetingFieldErrors {
  const errors: MeetingFieldErrors = {};
  for (const issue of error.issues) {
    const [field, index, key] = issue.path;
    const name = field === "speakers" && typeof index === "number" && typeof key === "string"
      ? `speakers.${index}.${key}` : String(field);
    const messages = (errors[name] ??= []);
    if (!messages.includes(issue.message)) messages.push(issue.message);
  }
  return errors;
}

function invalidState(values: MeetingFormValues, errors: MeetingFieldErrors): MeetingFormState {
  const count = Object.keys(errors).length;
  return {
    message: `The meeting was not saved. Fix ${count === 1 ? "the field" : `the ${count} fields`} marked below, then save again.`,
    errors,
    values,
  };
}

const dateTakenErrors: MeetingFieldErrors = {
  date: ["A meeting already exists on this date. Choose another Sunday or edit that meeting."],
};

function revalidateMeetings(): void {
  revalidatePath("/meetings");
  revalidatePath("/");
}

export async function createMeeting(prevState: MeetingFormState, formData: FormData): Promise<MeetingFormState> {
  await requireLeader();
  const values = readMeetingForm(formData);
  const parsed = MeetingFormSchema.safeParse(values);
  if (!parsed.success) return invalidState(values, toFieldErrors(parsed.error));
  try {
    await addMeeting(toMeetingRecord(parsed.data));
  } catch (error) {
    if (error instanceof MeetingDateTakenError) return invalidState(values, dateTakenErrors);
    console.error("createMeeting failed", error);
    throw new Error("The meeting could not be saved. Please try again in a moment.");
  }
  revalidateMeetings();
  redirect("/meetings");
}

export async function updateMeeting(id: number, prevState: MeetingFormState, formData: FormData): Promise<MeetingFormState> {
  await requireLeader();
  const meetingId = parseMeetingId(String(id));
  const values = readMeetingForm(formData);
  if (meetingId === null) return { message: "This meeting link is not valid.", errors: {}, values };
  const parsed = MeetingFormSchema.safeParse(values);
  if (!parsed.success) return invalidState(values, toFieldErrors(parsed.error));
  let updated: SacramentMeeting | null;
  try {
    updated = await updateMeetingRecord(meetingId, toMeetingRecord(parsed.data));
  } catch (error) {
    if (error instanceof MeetingDateTakenError) return invalidState(values, dateTakenErrors);
    console.error(`updateMeeting(${meetingId}) failed`, error);
    throw new Error("The meeting could not be updated. Please try again in a moment.");
  }
  if (!updated) {
    return { message: "This meeting no longer exists. It may have been deleted.", errors: {}, values };
  }
  revalidateMeetings();
  redirect("/meetings");
}

export async function deleteMeeting(id: number): Promise<void> {
  await requireLeader();
  const meetingId = parseMeetingId(String(id));
  if (meetingId === null) throw new Error("This meeting link is not valid.");
  try {
    await deleteMeetingRecord(meetingId);
  } catch (error) {
    console.error(`deleteMeeting(${meetingId}) failed`, error);
    throw new Error("The meeting could not be deleted. Please try again in a moment.");
  }
  revalidateMeetings();
}