import type { SacramentMeeting } from "./types";

export interface SpeakerFormValues {
  type: string;
  name: string;
  topic: string;
  referenceTitle: string;
  referenceUrl: string;
}

export interface MeetingFormValues {
  date: string;
  meetingType: string;
  presiding: string;
  conducting: string;
  openingHymnNumber: string;
  openingHymnTitle: string;
  openingPrayer: string;
  wardBusiness: string;
  stakeBusiness: boolean;
  sacramentHymnNumber: string;
  sacramentHymnTitle: string;
  speakers: SpeakerFormValues[];
  closingHymnNumber: string;
  closingHymnTitle: string;
  closingPrayer: string;
  announcements: string;
}

// Keys match input names; speaker fields use their position, as in "speakers.0.name".
export type MeetingFieldErrors = Partial<Record<string, string[]>>;

export interface MeetingFormState {
  message: string | null;
  errors: MeetingFieldErrors;
  values: MeetingFormValues | null;
}

export const initialMeetingFormState: MeetingFormState = { message: null, errors: {}, values: null };

export const emptyMeetingFormValues: MeetingFormValues = {
  date: "", meetingType: "regular", presiding: "", conducting: "",
  openingHymnNumber: "", openingHymnTitle: "", openingPrayer: "",
  wardBusiness: "", stakeBusiness: false,
  sacramentHymnNumber: "", sacramentHymnTitle: "",
  speakers: [],
  closingHymnNumber: "", closingHymnTitle: "", closingPrayer: "",
  announcements: "",
};

export function toMeetingFormValues(meeting: SacramentMeeting): MeetingFormValues {
  return {
    date: meeting.date,
    meetingType: meeting.meetingType,
    presiding: meeting.presiding,
    conducting: meeting.conducting,
    openingHymnNumber: String(meeting.openingHymn.number),
    openingHymnTitle: meeting.openingHymn.title,
    openingPrayer: meeting.openingPrayer,
    wardBusiness: meeting.wardBusiness.map((item) => item.description).join("\n"),
    stakeBusiness: meeting.stakeBusiness,
    sacramentHymnNumber: String(meeting.sacramentHymn.number),
    sacramentHymnTitle: meeting.sacramentHymn.title,
    speakers: meeting.speakers.map((item) => ({
      type: item.type, name: item.name, topic: item.topic,
      referenceTitle: item.reference?.title ?? "", referenceUrl: item.reference?.url ?? "",
    })),
    closingHymnNumber: String(meeting.closingHymn.number),
    closingHymnTitle: meeting.closingHymn.title,
    closingPrayer: meeting.closingPrayer,
    announcements: (meeting.announcements ?? []).join("\n"),
  };
}