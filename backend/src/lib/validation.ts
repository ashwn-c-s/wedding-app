export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface EventRecord {
  id: string; slug: string; name: string; date: string; time_label: string | null;
  venue_name: string | null; venue_address: string | null; maps_url: string | null;
  directions_text: string | null; is_visible: boolean; created_at?: string;
}
export interface Rsvp { guest_id: string; event_id: string; attending: boolean; submitted_at?: string; }
export function validateGuest(body: unknown): {name:string;phone:string;party_size:number;event_ids:string[]} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid guest details');
  const input = body as Record<string,unknown>;
  if (Object.keys(input).some(key=>!['name','phone','party_size','event_ids','tag_ids','new_tags','location'].includes(key))) throw new Error('Unsupported guest field');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length>200) throw new Error('Enter a name of at most 200 characters');
  if (typeof input.phone !== 'string' || !input.phone.trim() || input.phone.trim().length>50) throw new Error('Enter a phone number of at most 50 characters');
  if (!Number.isSafeInteger(input.party_size) || (input.party_size as number)<1 || (input.party_size as number)>1000) throw new Error('Party size must be between 1 and 1000');
  if (!Array.isArray(input.event_ids) || !input.event_ids.length || input.event_ids.length>100 || input.event_ids.some(id=>typeof id!=='string' || !uuid.test(id)) || new Set(input.event_ids).size!==input.event_ids.length) throw new Error('Choose one or more unique events');
  return {name:input.name.trim(),phone:input.phone.trim(),party_size:input.party_size as number,event_ids:input.event_ids as string[]};
}
export function validateResponses(body: unknown, allowedIds: string[]): {event_id: string; attending: boolean}[] {
  if (!body || typeof body !== 'object' || !('responses' in body) || !Array.isArray(body.responses)) throw new Error('Responses must be an array');
  const responses: {event_id: string; attending: boolean}[] = [];
  for (const item of body.responses) {
    if (!item || typeof item !== 'object' || typeof item.event_id !== 'string' || !uuid.test(item.event_id) || typeof item.attending !== 'boolean') throw new Error('Each response requires an event ID and boolean attending');
    if (responses.some(r => r.event_id === item.event_id)) throw new Error('Duplicate event response');
    if (!allowedIds.includes(item.event_id)) throw new Error('Event is not permitted');
    responses.push({event_id:item.event_id, attending:item.attending});
  }
  if (!responses.length || responses.length !== allowedIds.length) throw new Error('Respond to every invited event');
  return responses;
}
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) { if (c === '"' && csv[i+1] === '"') { cell += '"'; i++; } else if (c === '"') { quoted = false; closed = true; } else cell += c; }
    else if (c === '"') { if (cell.trim() || closed) throw new Error('Malformed CSV quoting'); cell = ''; quoted = true; }
    else if (c === ',') { row.push(cell.trim()); cell = ''; closed = false; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && csv[i+1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; closed = false; }
    else { if (closed && c.trim()) throw new Error('Malformed CSV quoting'); cell += c; }
  }
  if (quoted) throw new Error('Unterminated CSV quote');
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function validateEventPatch(body: unknown): Record<string, string | boolean | null> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid event update');
  const result: Record<string,string|boolean|null> = {};
  const textFields = ['slug','name','date','time_label','venue_name','venue_address','maps_url','directions_text'];
  for (const [key, value] of Object.entries(body)) {
    if (key === 'is_visible') { if (typeof value !== 'boolean') throw new Error('Visibility must be boolean'); result[key] = value; continue; }
    if (!textFields.includes(key)) throw new Error('Unsupported event field');
    if (value === null && !['slug','name','date'].includes(key)) { result[key] = null; continue; }
    if (typeof value !== 'string' || value.length > 4000) throw new Error('Invalid event text');
    const text = value.trim();
    if (['slug','name','date'].includes(key) && !text) throw new Error('Required event field is empty');
    if (key === 'slug' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)) throw new Error('Invalid slug');
    if (key === 'date') {
      const day = text.slice(0,10);
      const validDay = /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0,10) === day;
      const validShape = text === day || /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(text);
      if (!validDay || !validShape || !Number.isFinite(Date.parse(text))) throw new Error('Invalid date');
    }
    if (key === 'maps_url' && text) { let url; try { url = new URL(text); } catch { throw new Error('Invalid map URL'); } if (url.protocol !== 'https:') throw new Error('Map URL must use HTTPS'); }
    result[key] = text;
  }
  if (!Object.keys(result).length) throw new Error('No fields supplied');
  return result;
}
export function summarize(guests: {id:string;party_size:number}[], events: {id:string}[], assignments: {guest_id:string;event_id:string}[], responses: Rsvp[]) {
  const counts = {invited:guests.length, confirmed:0, declined:0, pending:0};
  for (const guest of guests) { const eventIds = assignments.filter(a=>a.guest_id === guest.id).map(a=>a.event_id); const saved = responses.filter(r=>r.guest_id === guest.id && eventIds.includes(r.event_id)); if (!eventIds.length || eventIds.some(id=>!saved.some(r=>r.event_id === id))) counts.pending++; else if (saved.some(r=>r.attending)) counts.confirmed++; else counts.declined++; }
  const event_counts = events.map(event => {
    const invited = new Set(assignments.filter(a=>a.event_id === event.id).map(a=>a.guest_id));
    const saved = responses.filter(r=>r.event_id === event.id && invited.has(r.guest_id));
    return {event_id:event.id, invited:invited.size, confirmed:saved.filter(r=>r.attending).length, declined:saved.filter(r=>!r.attending).length, pending:invited.size-saved.length, attendees:saved.filter(r=>r.attending).reduce((sum,r)=>sum+(guests.find(g=>g.id===r.guest_id)?.party_size ?? 0),0)};
  });
  return {counts,event_counts};
}
