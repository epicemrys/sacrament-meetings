import { getMostRecentSunday, getWardDate } from "./dates";
import type { GospelReference, SacramentMeeting } from "./types";

export const gospelSources: GospelReference[] = [
  { title: "Hymns of The Church of Jesus Christ of Latter-day Saints", url: "https://www.churchofjesuschrist.org/study/manual/hymns?lang=eng" },
  { title: "General Handbook, chapter 29: Meetings in the Church", url: "https://www.churchofjesuschrist.org/study/manual/general-handbook/29-meetings-in-the-church?lang=eng" },
  { title: "John 13:34–35 · Loving one another", url: "https://www.churchofjesuschrist.org/study/scriptures/nt/john/13?lang=eng&id=p34-p35#p34" },
  { title: "Mosiah 2:17 · Serving others", url: "https://www.churchofjesuschrist.org/study/scriptures/bofm/mosiah/2?lang=eng&id=p17#p17" },
];

const loveReference: GospelReference = gospelSources[2];
const serviceReference: GospelReference = gospelSources[3];

// Hymn numbers/titles and scripture references were checked in Gospel Library.
const meetings: SacramentMeeting[] = [
  {
    id: 1, date: "2026-05-03", meetingType: "testimony",
    presiding: "Bishop Onyemachi", conducting: "Sister Toluwalase",
    openingHymn: { number: 2, title: "The Spirit of God" },
    openingPrayer: "Sister Ogunkoya",
    wardBusiness: [{ description: "Sustaining of a new Primary president" }],
    stakeBusiness: false,
    sacramentHymn: { number: 183, title: "In Remembrance of Thy Suffering" },
    speakers: [],
    closingHymn: { number: 31, title: "O God, Our Help in Ages Past" },
    closingPrayer: "Brother Benedict",
    announcements: ["Please see the ward leaders for this month's temple visit arrangements."],
  },
  {
    id: 2, date: "2026-05-10", meetingType: "regular",
    presiding: "Bishop Onyemachi", conducting: "Sister Toluwalase",
    openingHymn: { number: 116, title: "Come, Follow Me" },
    openingPrayer: "Brother Etinosa",
    wardBusiness: [], stakeBusiness: false,
    sacramentHymn: { number: 169, title: "As Now We Take the Sacrament" },
    speakers: [
      { name: "Sister Favour", topic: "Showing Christlike love at home", type: "speaker", reference: loveReference },
      { name: "Ward Choir", topic: "Come, Follow Me · Hymn 116", type: "musical-number" },
      { name: "Brother Solomon", topic: "Finding opportunities to serve", type: "speaker", reference: serviceReference },
    ],
    closingHymn: { number: 152, title: "God Be with You Till We Meet Again" },
    closingPrayer: "Sister Williams",
    announcements: ["Youth service planning will take place after Sunday classes."],
  },
  {
    id: 3, date: "2026-05-17", meetingType: "regular",
    presiding: "Bishop Onyemachi", conducting: "Sister Toluwalase",
    openingHymn: { number: 31, title: "O God, Our Help in Ages Past" },
    openingPrayer: "Sister Merit",
    wardBusiness: [{ description: "Welcoming members who have recently moved into the ward" }],
    stakeBusiness: true,
    sacramentHymn: { number: 183, title: "In Remembrance of Thy Suffering" },
    speakers: [
      { name: "Brother Benjamin", topic: "Serving God by serving our neighbours", type: "speaker", reference: serviceReference },
      { name: "Sister Elohor", topic: "Becoming a more loving disciple", type: "speaker", reference: loveReference },
    ],
    closingHymn: { number: 116, title: "Come, Follow Me" },
    closingPrayer: "Brother Andrew",
  },
  {
    id: 4, date: "2026-09-06", meetingType: "testimony",
    presiding: "Bishop Onyemachi", conducting: "Sister Toluwalase",
    openingHymn: { number: 2, title: "The Spirit of God" },
    openingPrayer: "Sister Akinbiyi",
    wardBusiness: [], stakeBusiness: false,
    sacramentHymn: { number: 169, title: "As Now We Take the Sacrament" },
    speakers: [],
    closingHymn: { number: 152, title: "God Be with You Till We Meet Again" },
    closingPrayer: "Brother Osamagbe",
    announcements: ["Members are invited to help with the ward's September service activity."],
  },
  {
    id: 5, date: "2026-09-13", meetingType: "regular",
    presiding: "Bishop Onyemachi", conducting: "Sister Toluwalase",
    openingHymn: { number: 116, title: "Come, Follow Me" },
    openingPrayer: "Sister Mary",
    wardBusiness: [{ description: "Sustaining of a new Sunday School teacher" }],
    stakeBusiness: false,
    sacramentHymn: { number: 183, title: "In Remembrance of Thy Suffering" },
    speakers: [
      { name: "Sister Seyi", topic: "Following the Saviour through service", type: "speaker", reference: serviceReference },
      { name: "Ward Choir", topic: "The Spirit of God · Hymn 2", type: "musical-number" },
      { name: "Brother Ayobami", topic: "Love as a mark of discipleship", type: "speaker", reference: loveReference },
    ],
    closingHymn: { number: 31, title: "O God, Our Help in Ages Past" },
    closingPrayer: "Sister Brown",
    announcements: ["Please contact the ward leaders to volunteer for the neighbourhood clean-up.", "Ministering companionships are invited to arrange their next visits."],
  },
  {
    id: 6, date: "2026-09-20", meetingType: "regular",
    presiding: "Bishop Onyemachi", conducting: "Sister Toluwalase",
    openingHymn: { number: 2, title: "The Spirit of God" },
    openingPrayer: "Brother Samuel",
    wardBusiness: [], stakeBusiness: true,
    sacramentHymn: { number: 169, title: "As Now We Take the Sacrament" },
    speakers: [
      { name: "Sister Chioma", topic: "Small acts of kindness", type: "speaker", reference: loveReference },
      { name: "Brother Charles", topic: "Serving with a willing heart", type: "speaker", reference: serviceReference },
    ],
    closingHymn: { number: 116, title: "Come, Follow Me" },
    closingPrayer: "Sister Williams",
    announcements: [],
  },
  {
    id: 7, date: "2026-09-27", meetingType: "regular",
    presiding: "Bishop Onyemachi", conducting: "Sister Toluwalase",
    openingHymn: { number: 31, title: "O God, Our Help in Ages Past" },
    openingPrayer: "Sister Comfort",
    wardBusiness: [{ description: "Welcoming new ward members" }],
    stakeBusiness: false,
    sacramentHymn: { number: 183, title: "In Remembrance of Thy Suffering" },
    speakers: [
      { name: "Brother Chibuike", topic: "Making time for our neighbours", type: "speaker", reference: serviceReference },
      { name: "Youth Choir", topic: "Come, Follow Me · Hymn 116", type: "musical-number" },
      { name: "Sister Joshua", topic: "Following Jesus Christ each day", type: "speaker", reference: loveReference },
    ],
    closingHymn: { number: 152, title: "God Be with You Till We Meet Again" },
    closingPrayer: "Brother Victory",
    announcements: ["Please check with ward leaders for next month's meeting arrangements."],
  },
];

export function getMeetings(date?: string | null, now: Date = new Date()): SacramentMeeting[] {
  const today = getWardDate(now);
  return structuredClone(meetings.filter((meeting) => !date || meeting.date === date))
    .sort((a, b) => {
      const aUpcoming = a.date > today;
      const bUpcoming = b.date > today;
      // Show the latest meeting that has occurred first, not the furthest future date.
      if (aUpcoming !== bUpcoming) return aUpcoming ? 1 : -1;
      return aUpcoming ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });
}

export function getMeetingById(id: number): SacramentMeeting | null {
  const meeting = meetings.find((item) => item.id === id);
  return meeting ? structuredClone(meeting) : null;
}

export function getCurrentMeeting(now: Date = new Date()): SacramentMeeting | null {
  return getMeetings(getMostRecentSunday(now), now)[0] ?? null;
}
