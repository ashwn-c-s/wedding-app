import { DashboardData } from '../models/admin';
export function invitationLink(origin: string, token: string): string { return `${origin.replace(/\/$/, '')}/invite/${encodeURIComponent(token)}`; }
export function whatsAppLink(origin: string, token: string, name: string, phone: string): string {
  const digits = /^\+[1-9]\d{7,14}$/.test(phone.trim()) ? phone.trim().slice(1) : '';
  const text = `Dear ${name}, we would love to celebrate our wedding with you! ${invitationLink(origin, token)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function buildCsv(rows: unknown[][]): string { return rows.map(row => row.map(csvCell).join(',')).join('\r\n'); }
export interface AttendanceRow { guestId: string; name: string; partySize: number; eventId: string; event: string; response: 'Confirmed' | 'Declined' | 'Pending'; submittedAt: string; }
export function attendanceRows(data: DashboardData, search = '', eventId = ''): AttendanceRow[] {
  const responses = new Map(data.responses.map(r => [`${r.guest_id}:${r.event_id}`, r]));
  const guests = new Map(data.guests.map(g => [g.id, g]));
  const rows: AttendanceRow[] = [];
  for (const guest of guests.values()) {
    if (!guest.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) continue;
    if (!guest.event_ids.length && !eventId) rows.push({guestId:guest.id,name:guest.name,partySize:guest.party_size,eventId:'',event:'No events assigned',response:'Pending',submittedAt:''});
    for (const event of data.events) {
      if (eventId && event.id !== eventId) continue;
      if (!guest.event_ids.includes(event.id)) continue;
      const response = responses.get(`${guest.id}:${event.id}`);
      rows.push({guestId: guest.id, name: guest.name, partySize: guest.party_size, eventId: event.id, event: event.name,
        response: response ? (response.attending ? 'Confirmed' : 'Declined') : 'Pending', submittedAt: response?.submitted_at ?? ''});
    }
  }
  return rows;
}
export function attendanceSummary(rows: AttendanceRow[], guests?: DashboardData['guests']) {
  const invitations = new Map<string, AttendanceRow[]>([]);
  for (const row of rows) invitations.set(row.guestId, [...(invitations.get(row.guestId) ?? []), row]);
  let confirmed = 0, declined = 0, pending = 0, peopleInvited = 0;
  const unassigned = guests?.filter(guest => !invitations.has(guest.id)) ?? [];
  for (const guest of new Map(unassigned.map(guest => [guest.id, guest])).values()) { invitations.set(guest.id, []); peopleInvited += guest.party_size; pending++; }
  for (const responses of invitations.values()) {
    if (!responses.length) continue;
    peopleInvited += responses[0].partySize;
    if (responses.some(row => row.response === 'Pending')) pending++;
    else if (responses.some(row => row.response === 'Confirmed')) confirmed++;
    else declined++;
  }
  return {invited: invitations.size, peopleInvited, confirmed, declined, pending};
}
