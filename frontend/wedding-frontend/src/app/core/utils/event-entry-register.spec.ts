import type { ContentTable } from 'pdfmake/interfaces';
import type { DashboardData } from '../models/admin';
import { buildEntryRegister } from './event-entry-register';

const family = { id: 'family', name: 'Family' },
  office = { id: 'office', name: 'Office' };
export const registerData: DashboardData = {
  guests: [
    { id: 'b', name: 'Binu', party_size: 2, event_ids: ['wedding'], tags: [office] },
    {
      id: 'a',
      name: 'Anita family',
      party_size: 4,
      event_ids: ['wedding', 'wedding', 'reception'],
      tags: [family, office],
    },
    { id: 'c', name: 'Chitra', party_size: 3, event_ids: ['reception'], tags: [] },
    { id: 'd', name: 'Unassigned', party_size: 5, event_ids: [], tags: [] },
  ],
  tags: [family, office],
  events: [
    {
      id: 'wedding',
      slug: 'wedding',
      name: 'Wedding',
      date: '2026-11-15',
      time_label: 'Morning',
      venue_name: 'Wedding hall',
      venue_address: null,
      maps_url: null,
      directions_text: null,
    },
  ],
  responses: [{ guest_id: 'a', event_id: 'wedding', attending: false, submitted_at: '' }],
};
const generatedAt = new Date('2026-10-21T10:00:00Z');
const build = (extra = {}) =>
  buildEntryRegister(registerData, { eventId: 'wedding', allowTags: true, generatedAt, ...extra });
const mainTable = (result: ReturnType<typeof build>) =>
  (result.definition.content as ContentTable[])[0].table;

describe('Event entry register document', () => {
  it('includes every event party once, alphabetically, regardless of response and tags', () => {
    const result = build();
    const body = mainTable(result).body;
    expect(body).toHaveLength(9);
    expect(JSON.stringify(body[7])).toContain('Anita family');
    expect(JSON.stringify(body[8])).toContain('Binu');
    expect(JSON.stringify(body)).toContain('6 PEOPLE INVITED | 2 INVITATION PARTIES');
    expect(JSON.stringify(body)).not.toContain('Chitra');
    expect(JSON.stringify(body)).not.toContain('Unassigned');
    expect(result.filename).toBe('wedding-entry-register-2026-10-21.pdf');
    expect(mainTable(result)).toMatchObject({
      headerRows: 7,
      dontBreakRows: true,
      keepWithHeaderRows: 1,
    });
    const withoutResponses = buildEntryRegister(
      { ...registerData, responses: [] },
      { eventId: 'wedding', allowTags: true, generatedAt },
    );
    expect(JSON.stringify(withoutResponses.definition.content)).toBe(
      JSON.stringify(result.definition.content),
    );
  });
  it('provides writable admitted and notes columns, with A4 pages and repeating metadata', () => {
    const result = build();
    expect(result.definition.pageSize).toBe('A4');
    expect(JSON.stringify(mainTable(result).body[6])).toContain('Admitted');
    expect(JSON.stringify(mainTable(result).body[7])).toContain('______');
    expect(result.definition.footer).toBeTypeOf('function');
  });
  it('labels filtered scope, applies match-any tags with search, and includes filter warning in footer', () => {
    const result = build({ search: 'Anita', tagIds: ['family', 'office'] });
    expect(mainTable(result).body).toHaveLength(8);
    expect(JSON.stringify(result.definition.content)).toContain('FILTERED REGISTER');
    expect(JSON.stringify(result.definition.content)).toContain('Name: Anita');
    expect(JSON.stringify(result.definition.content)).toContain('Family or Office');
    expect(result.filename).toContain('-filtered-');
  });
  it('removes all private tag names and ignores tag filters for restricted admins', () => {
    const result = build({ allowTags: false, tagIds: ['family'] });
    const text = JSON.stringify(result.definition.content);
    expect(text).not.toContain('Office');
    expect(text).not.toContain('Family');
    expect(text).toContain('Anita family');
    expect(text).toContain('Binu');
    expect(result.filename).not.toContain('-filtered-');
  });
  it('keeps unassigned guests in a separate review appendix, never in the main venue list', () => {
    const result = build({ includeUnassigned: true });
    const sections = result.definition.content as ContentTable[];
    expect(sections).toHaveLength(2);
    expect(sections[1].pageBreak).toBe('before');
    expect(JSON.stringify(sections[1])).toContain('UNASSIGNED INVITATIONS - REVIEW REQUIRED');
    expect(JSON.stringify(sections[1])).toContain('Unassigned');
    expect(JSON.stringify(sections[0])).not.toContain('Unassigned');
  });
  it('handles empty event lists and rejects an invalid selected event', () => {
    const result = build({ search: 'Missing' });
    expect(JSON.stringify(result.definition.content)).toContain('No invitation parties match');
    expect(() => build({ eventId: 'missing' })).toThrow('Select an available event');
  });
});
