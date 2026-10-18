import { attendanceRows, attendanceSummary, buildCsv, invitationLink, whatsAppLink, whatsAppMessage } from './admin';
import { DashboardData } from '../models/admin';
import { Event } from '../models/index';
const event = (id: string): Event => ({id,slug:id,name:id,date:'2026-12-01',time_label:'Evening',venue_name:null,venue_address:null,maps_url:null,directions_text:null,is_visible:true});
describe('Admin attendance and sharing', () => {
  const data: DashboardData = {guests:[{id:'a',name:'A family',party_size:3,event_ids:['w','r']},{id:'b',name:'B',party_size:2,event_ids:['w']}],events:[event('w'),event('r')],responses:[{guest_id:'a',event_id:'w',attending:true,submitted_at:'date'},{guest_id:'a',event_id:'r',attending:false,submitted_at:'date'}]};
  it('counts each party once and treats incomplete responses as pending', () => {
    expect(attendanceSummary(attendanceRows(data))).toEqual({invited:2,peopleInvited:5,confirmed:1,declined:0,pending:1});
    expect(attendanceSummary(attendanceRows(data,'A','r'))).toEqual({invited:1,peopleInvited:3,confirmed:0,declined:1,pending:0});
  });
  it('includes unassigned parties in totals as pending without duplicating assigned parties', () => {
    const guests = [...data.guests,{id:'c',name:'Unassigned',party_size:4,event_ids:[]}];
    expect(attendanceRows({...data,guests}).find(row => row.guestId === 'c')?.event).toBe('No events assigned');
    expect(attendanceRows({...data,guests}, '', 'w').some(row => row.guestId === 'c')).toBe(false);
    expect(attendanceSummary(attendanceRows(data), guests)).toEqual({invited:3,peopleInvited:9,confirmed:1,declined:0,pending:2});
  });
  it('includes only permitted events and applies both filters to exported rows', () => {
    const rows = attendanceRows(data,'B','r'); expect(rows).toEqual([]);
    expect(attendanceRows(data,'A','w').map(row=>row.partySize)).toEqual([3]);
  });
  it('escapes commas, quotes, newlines and neutralizes spreadsheet formulas', () => {
    expect(buildCsv([['=CMD()', '  +formula','Name, "Quoted"','a\nb']])).toBe('"\'=CMD()","\'  +formula","Name, ""Quoted""","a\nb"');
  });
  it('generates frontend-origin links with encoded invitation tokens', () => {
    expect(invitationLink('https://wedding.example/','a/b')).toBe('https://wedding.example/invite/a%2Fb');
    const url = new URL(whatsAppLink('https://wedding.example','token','A&B','9876543210'));
    expect(url.pathname).toBe('/'); expect(url.searchParams.get('text')).toContain('https://wedding.example/invite/token');
    expect(new URL(whatsAppLink('https://wedding.example','token','A','+919876543210')).pathname).toBe('/919876543210');
  });
});

describe('WhatsApp event invitation', () => {
  it('lists visible events chronologically with exact IST times, maps and the RSVP link', () => {
    const wedding = {...event('wedding'),name:'Wedding Ceremony',date:'2026-11-15T05:00:00+00:00',time_label:'Morning',venue_name:'K M Auditorium',maps_url:'https://maps.app.goo.gl/wedding'};
    const reception = {...event('reception'),name:'Wedding Reception',date:'2026-11-15T12:00:00Z',maps_url:'https://maps.app.goo.gl/reception'};
    const events = [reception, {...event('hidden'),is_visible:false}, wedding];
    const text = whatsAppMessage('https://wedding.example','token','Satheesh',events);
    expect(text).toBe([
      'Dear Satheesh, we would love to celebrate our wedding with you!',
      '*Wedding Ceremony*\nSunday, 15 November 2026 · 10:30 am IST\nK M Auditorium\nMap: https://maps.app.goo.gl/wedding',
      '*Wedding Reception*\nSunday, 15 November 2026 · 5:30 pm IST\nMap: https://maps.app.goo.gl/reception',
      'Your invitation & RSVP:\nhttps://wedding.example/invite/token',
    ].join('\n\n'));
    expect(events[0]).toBe(reception);
  });
  it('converts the date as well as time to IST and retains date-only time labels', () => {
    const text = whatsAppMessage('https://wedding.example','token','A',[
      {...event('late'),date:'2026-11-14T20:00:00Z'},
      {...event('legacy'),date:'2026-11-16'},
    ]);
    expect(text).toContain('Sunday, 15 November 2026 · 1:30 am IST');
    expect(text).toContain('Monday, 16 November 2026 · Evening');
    expect(text).not.toContain('12:00 am');
  });
  it('falls back to venue search for unsafe maps and reports missing details honestly', () => {
    const text = whatsAppMessage('https://wedding.example','token','A',[
      {...event('venue'),maps_url:'javascript:alert(1)',venue_name:'Hall & Garden',venue_address:'Thrissur'},
      {...event('unknown'),date:'invalid'},
    ]);
    expect(text).toContain('Map: https://www.google.com/maps/search/?api=1&query=Hall%20%26%20Garden%2C%20Thrissur');
    expect(text).not.toContain('javascript:');
    expect(text).toContain('Date to be announced');
    expect(text).toContain('Location to be announced');
  });
  it('round-trips multiline and special characters through the WhatsApp link', () => {
    const events = [{...event('w'),name:'Wedding & celebration ♥'}];
    const url = new URL(whatsAppLink('https://wedding.example','a/b','A & B ♥','+919876543210',events));
    expect(url.searchParams.get('text')).toBe(whatsAppMessage('https://wedding.example','a/b','A & B ♥',events));
    expect(url.pathname).toBe('/919876543210');
    expect(whatsAppMessage('https://wedding.example','token','A',[])).not.toContain('Location to be announced');
  });
});
