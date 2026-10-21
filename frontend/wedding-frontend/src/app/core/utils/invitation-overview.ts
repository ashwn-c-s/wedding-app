import { DashboardData, GuestTag } from '../models/admin';
import { matchesAnyTag, matchesTag } from './tags';

export interface InvitationFilters {
  search?: string;
  eventId?: string;
  tagIds?: string[];
  /** Only full admins may inspect or filter private guest tags. */
  allowTags?: boolean;
}

export interface InvitationTotals {
  invited: number;
  peopleInvited: number;
}

export interface InvitationTagSummary extends InvitationTotals {
  id: string;
  name: string;
}

export interface InvitationEventSummary extends InvitationTotals {
  id: string;
  name: string;
  tags: InvitationTagSummary[];
}

export interface InvitationOverview {
  overall: InvitationTotals;
  filtered: InvitationTotals;
  guests: DashboardData['guests'];
  events: InvitationEventSummary[];
  unassigned: InvitationTotals;
  tags: GuestTag[];
}

function totals(guests: DashboardData['guests']): InvitationTotals {
  return {
    invited: guests.length,
    peopleInvited: guests.reduce((sum, guest) => sum + guest.party_size, 0),
  };
}

/** Invitation records and party sizes are the only inputs to headcounts. */
export function invitationOverview(
  data: DashboardData,
  filters: InvitationFilters = {},
): InvitationOverview {
  const uniqueGuests = [...new Map(data.guests.map((guest) => [guest.id, guest])).values()];
  const search = (filters.search ?? '').trim().toLocaleLowerCase();
  const tagIds = filters.allowTags ? (filters.tagIds ?? []) : [];
  const guests = uniqueGuests.filter(
    (guest) =>
      guest.name.toLocaleLowerCase().includes(search) &&
      (!filters.eventId || guest.event_ids.includes(filters.eventId)) &&
      matchesAnyTag(guest.tags, tagIds),
  );
  const tags = filters.allowTags
    ? [
        ...new Map(
          [...(data.tags ?? []), ...uniqueGuests.flatMap((guest) => guest.tags ?? [])].map(
            (tag) => [tag.id, tag],
          ),
        ).values(),
      ]
    : [];
  const breakdownTags = [...tags, { id: 'untagged', name: 'Untagged' }];
  const events = [...new Map(data.events.map((event) => [event.id, event])).values()]
    .filter((event) => !filters.eventId || event.id === filters.eventId)
    .map((event) => {
      const parties = guests.filter((guest) => guest.event_ids.includes(event.id));
      return {
        id: event.id,
        name: event.name,
        ...totals(parties),
        tags: filters.allowTags
          ? breakdownTags.flatMap((tag) => {
              const taggedParties = parties.filter((guest) => matchesTag(guest.tags, tag.id));
              return taggedParties.length
                ? [{ id: tag.id, name: tag.name, ...totals(taggedParties) }]
                : [];
            })
          : [],
      };
    });
  return {
    overall: totals(uniqueGuests),
    filtered: totals(guests),
    guests: filters.allowTags ? guests : guests.map(({ tags: _tags, ...guest }) => guest),
    events,
    unassigned: totals(guests.filter((guest) => !guest.event_ids.length)),
    tags,
  };
}

/** Pass these rows to buildCsv, which escapes cells and protects spreadsheet formulas. */
export function invitationPlanningRows(
  data: DashboardData,
  filters: InvitationFilters = {},
): unknown[][] {
  const overview = invitationOverview(data, filters);
  const rows: unknown[][] = [
    ['Guest', 'Party size', 'Event', ...(filters.allowTags ? ['Tags'] : [])],
  ];
  for (const guest of overview.guests) {
    const events = overview.events.filter((event) => guest.event_ids.includes(event.id));
    const eventNames = events.map((event) => event.name);
    if (!guest.event_ids.length && !filters.eventId) eventNames.push('No events assigned');
    else if (!eventNames.length && !filters.eventId) eventNames.push('Assigned event unavailable');
    for (const name of eventNames) {
      rows.push([
        guest.name,
        guest.party_size,
        name,
        ...(filters.allowTags ? [(guest.tags ?? []).map((tag) => tag.name).join('|')] : []),
      ]);
    }
  }
  return rows;
}
