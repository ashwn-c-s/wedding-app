import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { AdminService } from '../../../core/services/admin.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

const office={id:'office',name:'Office friends'};
const data={
  guests:[
    {id:'a',name:'Attending family',party_size:2,event_ids:['wedding','reception'],tags:[office]},
    {id:'b',name:'Declining family',party_size:5,event_ids:['wedding','reception'],tags:[office]},
    {id:'c',name:'Pending family',party_size:3,event_ids:['wedding'],tags:[]},
    {id:'d',name:'Unassigned family',party_size:8,event_ids:[],tags:[]},
  ],
  events:[{id:'wedding',name:'Wedding'},{id:'reception',name:'Reception'},{id:'unused',name:'Other event'}].map(event=>({...event,slug:event.id,date:'2026-11-15T05:00:00Z',time_label:'Morning',venue_name:null,venue_address:null,maps_url:null,directions_text:null})),
  responses:[{guest_id:'a',event_id:'wedding',attending:true,submitted_at:''},{guest_id:'b',event_id:'wedding',attending:false,submitted_at:''}],
  tags:[office],
};
describe('Event invitation totals',()=>{
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideRouter([]),
    {provide:AdminAuthService,useValue:{role:()=> 'full'}},
    {provide:AdminService,useValue:{dashboard:()=>of(data)}},
  ]}));
  it('renders only Event, Invitations and People invited, including all RSVP outcomes',async()=>{
    const fixture=TestBed.createComponent(Dashboard);await fixture.componentInstance.load();fixture.detectChanges();
    const section:HTMLElement=fixture.nativeElement.querySelector('[aria-labelledby="event-attendance-title"]');
    expect([...section.querySelectorAll('th')].map(th=>th.textContent?.trim())).toEqual(['Event','Invitations','People invited']);
    expect([...section.querySelectorAll('tbody tr')].map(row=>[...row.querySelectorAll('td')].map(td=>td.textContent?.trim()))).toEqual([
      ['Wedding','3','10'],['Reception','2','7'],['Other event','0','0'],
    ]);
    expect(section.textContent).not.toContain('Confirmed');expect(section.textContent).not.toContain('Declined');
    expect(fixture.nativeElement.querySelector('[aria-label="Invitation totals"]').textContent).not.toContain('Confirmed invitations');
  });
  it('respects search, event and tag filters without counting a party twice',async()=>{
    const component=TestBed.runInInjectionContext(()=>new Dashboard());await component.load();
    component.tagIds.set([office.id]);component.eventId.set('wedding');
    expect(component.eventSummary()).toEqual([{id:'wedding',name:'Wedding',invited:2,peopleInvited:7}]);
    component.search.set('Declining');expect(component.eventSummary()[0]).toMatchObject({invited:1,peopleInvited:5});
    component.data.set({...data,responses:[]});expect(component.eventSummary()[0]).toMatchObject({invited:1,peopleInvited:5});
  });
  it('uses the correct three-column empty state when no events exist',async()=>{
    const fixture=TestBed.createComponent(Dashboard);await fixture.componentInstance.load();
    fixture.componentInstance.data.set({...data,events:[]});fixture.detectChanges();
    const cell:HTMLTableCellElement=fixture.nativeElement.querySelector('[aria-labelledby="event-attendance-title"] tbody td');
    expect(cell.colSpan).toBe(3);expect(cell.textContent).toContain('No events available');
  });
});
