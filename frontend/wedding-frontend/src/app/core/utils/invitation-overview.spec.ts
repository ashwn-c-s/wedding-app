import { DashboardData } from '../models/admin';
import { Event } from '../models';
import { buildCsv } from './admin';
import { invitationOverview, invitationPlanningRows } from './invitation-overview';

const family = { id: 'family', name: 'Family' };
const friends = { id: 'friends', name: 'Friends' };
const unused = { id: 'unused', name: 'Unused' };
const data: DashboardData = {
  guests: [
    {
      id: 'a',
      name: 'Anita',
      party_size: 4,
      event_ids: ['wedding', 'wedding', 'reception'],
      tags: [family, friends],
    },
    { id: 'b', name: 'Bala', party_size: 2, event_ids: ['wedding'], tags: [friends] },
    { id: 'c', name: 'Chitra', party_size: 3, event_ids: ['reception'], tags: [] },
    { id: 'd', name: 'Dev', party_size: 5, event_ids: [] },
  ],
  events: [
    { id: 'wedding', name: 'Wedding' },
    { id: 'reception', name: 'Reception' },
    { id: 'empty', name: 'Empty event' },
  ] as Event[],
  tags: [family, friends, unused],
  responses: [],
};

describe('Invitation overview analytics', () => {
  it('counts unique parties overall, overlapping event assignments separately, and preserves empty events', () => {
    const result = invitationOverview({ ...data, guests: [...data.guests, data.guests[0]] });
    expect(result.overall).toEqual({ invited: 4, peopleInvited: 14 });
    expect(result.filtered).toEqual(result.overall);
    expect(result.events.map((event) => [event.id, event.invited, event.peopleInvited])).toEqual([
      ['wedding', 2, 6],
      ['reception', 2, 7],
      ['empty', 0, 0],
    ]);
    expect(result.unassigned).toEqual({ invited: 1, peopleInvited: 5 });
  });

  it('shows represented overlapping tags and untagged parties within each event', () => {
    const result = invitationOverview(data, { allowTags: true });
    expect(result.events[0].tags).toEqual([
      { ...family, invited: 1, peopleInvited: 4 },
      { ...friends, invited: 2, peopleInvited: 6 },
    ]);
    expect(result.events[1].tags.at(-1)).toEqual({
      id: 'untagged',
      name: 'Untagged',
      invited: 1,
      peopleInvited: 3,
    });
    expect(result.events[2].tags).toEqual([]);
  });

  it('combines search, event and match-any tags without duplicating families', () => {
    const filters = {
      allowTags: true,
      tagIds: ['family', 'friends', 'untagged'],
      eventId: 'wedding',
      search: ' ANITA ',
    };
    const result = invitationOverview(data, filters);
    expect(result.filtered).toEqual({ invited: 1, peopleInvited: 4 });
    expect(result.overall).toEqual({ invited: 4, peopleInvited: 14 });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].tags.map((tag) => tag.id)).toEqual(['family', 'friends']);
    expect(result.unassigned.invited).toBe(0);
    expect(
      invitationOverview(data, { allowTags: true, tagIds: ['family', 'friends'] }).filtered
        .peopleInvited,
    ).toBe(6);
    expect(
      invitationOverview(data, { allowTags: true, tagIds: ['untagged'] }).filtered.peopleInvited,
    ).toBe(8);
  });

  it('ignores responses regardless of recorded attendance or submission status', () => {
    const expected = invitationOverview(data, { allowTags: true });
    for (const attending of [true, false]) {
      expect(
        invitationOverview(
          {
            ...data,
            responses: [
              { guest_id: 'a', event_id: 'wedding', attending, submitted_at: '2026-10-21' },
            ],
          },
          { allowTags: true },
        ),
      ).toEqual(expected);
    }
  });

  it('ignores tag filters and removes private tags from all restricted output', () => {
    const result = invitationOverview(data, { allowTags: false, tagIds: ['family'] });
    expect(result.filtered.peopleInvited).toBe(14);
    expect(result.tags).toEqual([]);
    expect(result.events.every((event) => event.tags.length === 0)).toBe(true);
    expect(result.guests.every((guest) => !('tags' in guest))).toBe(true);
    expect(JSON.stringify(result)).not.toContain('Family');
    expect(invitationOverview(data).tags).toEqual([]);
  });

  it('handles empty data and zero-match filters', () => {
    const result = invitationOverview({ guests: [], events: [], responses: [] });
    expect(result.filtered).toEqual({ invited: 0, peopleInvited: 0 });
    expect(result.events).toEqual([]);
    expect(
      invitationOverview(data, { search: 'missing' }).events.map((event) => event.peopleInvited),
    ).toEqual([0, 0, 0]);
  });
});

describe('Invitation planning export', () => {
  it('preserves a party whose assigned event is no longer available', () => {
    const missingEventData = {
      ...data,
      guests: [{ ...data.guests[0], event_ids: ['missing', 'missing'] }],
    };
    const result = invitationOverview(missingEventData);
    expect(result.filtered).toEqual({ invited: 1, peopleInvited: 4 });
    expect(invitationPlanningRows(missingEventData)).toEqual([
      ['Guest', 'Party size', 'Event'],
      ['Anita', 4, 'Assigned event unavailable'],
    ]);
    expect(invitationPlanningRows(missingEventData, { eventId: 'wedding' })).toHaveLength(1);
  });

  it('exports unique guest-event rows, unassigned parties, and permitted tags without response fields', () => {
    const rows = invitationPlanningRows(
      { ...data, guests: [...data.guests, data.guests[0]] },
      { allowTags: true },
    );
    expect(rows[0]).toEqual(['Guest', 'Party size', 'Event', 'Tags']);
    expect(rows).toHaveLength(6);
    expect(rows.filter((row) => row[0] === 'Anita')).toHaveLength(2);
    expect(rows.at(-1)).toEqual(['Dev', 5, 'No events assigned', '']);
    expect(rows[1].at(-1)).toBe('Family|Friends');
  });

  it('shares filters with analytics, excludes private tag columns and remains formula-safe through buildCsv', () => {
    const rows = invitationPlanningRows(data, {
      eventId: 'wedding',
      search: 'anita',
      tagIds: ['unused'],
    });
    expect(rows).toEqual([
      ['Guest', 'Party size', 'Event'],
      ['Anita', 4, 'Wedding'],
    ]);
    const dangerous = { ...data, guests: [{ ...data.guests[0], name: '=formula' }] };
    expect(buildCsv(invitationPlanningRows(dangerous))).toContain('"\'=formula"');
    expect(buildCsv(invitationPlanningRows(data))).not.toContain('Family');
  });
});
