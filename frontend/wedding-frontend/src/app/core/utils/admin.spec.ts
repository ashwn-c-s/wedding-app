import { attendanceRows, attendanceSummary, buildCsv, invitationLink, whatsAppLink } from './admin';
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
