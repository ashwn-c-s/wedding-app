import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { DashboardData } from '../models/admin';
import { invitationOverview } from './invitation-overview';

export interface EntryRegisterOptions {
  eventId: string;
  allowTags: boolean;
  search?: string;
  tagIds?: string[];
  includeUnassigned?: boolean;
  generatedAt?: Date;
  dataAsOf?: Date | null;
}

const indiaDate = (value: Date, withTime = false) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? ({ hour: '2-digit', minute: '2-digit' } as const) : {}),
  }).format(value) + (withTime ? ' IST' : '');

export function buildEntryRegister(
  data: DashboardData,
  options: EntryRegisterOptions,
): {
  definition: TDocumentDefinitions;
  filename: string;
} {
  const event = data.events.find((item) => item.id === options.eventId);
  if (!event) throw new Error('Select an available event before exporting.');
  const search = options.search?.trim() || '';
  const selectedTags = options.allowTags ? (options.tagIds ?? []) : [];
  const filters = { search, tagIds: selectedTags, allowTags: options.allowTags };
  const view = invitationOverview(data, { ...filters, eventId: event.id });
  const filtered = !!search || selectedTags.length > 0;
  const generated = options.generatedAt ?? new Date();
  const tagNames = selectedTags.map((id) =>
    id === 'untagged' ? 'Untagged' : view.tags.find((tag) => tag.id === id)?.name || 'Selected tag',
  );
  const scope = filtered
    ? `FILTERED REGISTER - ${[search ? `Name: ${search}` : '', tagNames.length ? `Tags: ${tagNames.join(' or ')} (matches any)` : ''].filter(Boolean).join(' | ')}`
    : 'FULL EVENT REGISTER - All invitation parties assigned to this event';
  const sortGuests = (guests: DashboardData['guests']) =>
    [...guests].sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'en-IN', { sensitivity: 'base', numeric: true }) ||
        a.id.localeCompare(b.id),
    );
  const guests = sortGuests(view.guests);
  const unassigned = options.includeUnassigned
    ? sortGuests(
        invitationOverview(data, filters).guests.filter((guest) => !guest.event_ids.length),
      )
    : [];
  const date = new Date(event.date);
  const eventLine = [
    Number.isNaN(date.getTime()) ? 'Date to be announced' : indiaDate(date),
    event.time_label,
    event.venue_name,
  ]
    .filter(Boolean)
    .join(' | ');
  // Repeat metadata as table header rows so long names/filter labels can wrap naturally.
  const fullRow = (text: Content, extra: object = {}): TableCell[] => [
    { stack: [text], colSpan: 5, ...extra } as TableCell,
    {},
    {},
    {},
    {},
  ];
  const table = (parties: typeof guests, appendix: boolean): Content => {
    const heading = appendix
      ? 'UNASSIGNED INVITATIONS - REVIEW REQUIRED'
      : `${event.name.toUpperCase()} - ENTRY REGISTER`;
    const total = parties.reduce((sum, guest) => sum + guest.party_size, 0);
    const rows: TableCell[][] = [
      fullRow({
        text: 'ASHWIN & AMRITHA',
        fontSize: 9,
        characterSpacing: 1.5,
        margin: [0, 0, 0, 5],
      }),
      fullRow({ text: heading, fontSize: 18, bold: true, margin: [0, 0, 0, 6] }),
      fullRow({
        text: appendix
          ? 'These parties have no assigned event. This appendix is not a venue admission list.'
          : eventLine,
        fontSize: 10,
        margin: [0, 0, 0, 6],
      }),
      fullRow({
        text: `${total} PEOPLE INVITED | ${parties.length} INVITATION PARTIES`,
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 6],
      }),
      fullRow({
        text: appendix
          ? filtered
            ? scope
            : 'UNASSIGNED APPENDIX - Not assigned to any event'
          : scope,
        bold: filtered,
        fontSize: 9,
        margin: [0, 0, 0, 5],
      }),
      fullRow({
        text: `Generated: ${indiaDate(generated, true)}${options.dataAsOf ? ` | Data loaded: ${indiaDate(options.dataAsOf, true)}` : ''}`,
        color: '#475569',
        fontSize: 8,
        margin: [0, 0, 0, 12],
      }),
      ['No.', 'Guest / invitation', 'Invited', 'Admitted', 'Notes'].map((text) => ({
        text,
        bold: true,
        fontSize: 10,
        fillColor: '#f1f5f9',
        margin: [0, 5, 0, 5],
      })),
    ];
    if (!parties.length)
      rows.push(
        fullRow({
          text: 'No invitation parties match this event and export scope.',
          margin: [0, 12, 0, 12],
        }),
      );
    parties.forEach((guest, index) => {
      const tags = options.allowTags
        ? guest.tags?.map((tag) => tag.name).join(' | ') || 'Untagged'
        : '';
      rows.push([
        { text: String(index + 1).padStart(2, '0'), fontSize: 9 },
        {
          stack: [
            { text: guest.name, fontSize: 12, bold: true },
            ...(tags
              ? [
                  {
                    text: tags,
                    fontSize: 8,
                    color: '#475569',
                    margin: [0, 4, 0, 0] as [number, number, number, number],
                  },
                ]
              : []),
          ],
        },
        { text: String(guest.party_size), alignment: 'center' },
        { text: appendix ? '-' : '______', alignment: 'center', color: '#475569' },
        { text: '' },
      ]);
    });
    return {
      ...(appendix ? { pageBreak: 'before' } : {}),
      table: {
        headerRows: 7,
        widths: [23, '*', 42, 54, 106],
        body: rows,
        dontBreakRows: true,
        keepWithHeaderRows: 1,
        heights: (row) => (row >= 7 ? 28 : 'auto'),
      },
      layout: {
        hLineWidth: (index) => (index >= 6 ? 0.5 : 0),
        vLineWidth: () => 0,
        hLineColor: () => '#cbd5e1',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: (index) => (index >= 7 ? 8 : 0),
        paddingBottom: (index) => (index >= 7 ? 8 : 0),
      },
    };
  };
  const slug =
    (event.slug || event.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'event';
  return {
    filename: `${slug}-entry-register${filtered ? '-filtered' : ''}-${generated.toISOString().slice(0, 10)}.pdf`,
    definition: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [34, 30, 34, 48],
      defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
      info: { title: `${event.name} - Entry register`, author: 'Wedding administration' },
      content: [table(guests, false), ...(unassigned.length ? [table(unassigned, true)] : [])],
      footer: (page, pages) => ({
        margin: [34, 10, 34, 0],
        stack: [
          {
            columns: [
              { text: event.name, width: '*' },
              { text: `Page ${page} of ${pages}`, alignment: 'right', width: 'auto' },
            ],
            fontSize: 8,
          },
          {
            text: `${filtered ? 'FILTERED REGISTER | ' : ''}Invitation-based register - Not an RSVP attendance list`,
            fontSize: 7,
            color: '#475569',
            margin: [0, 4, 0, 0],
          },
        ],
      }),
    },
  };
}
