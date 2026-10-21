import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { AdminService } from '../../../core/services/admin.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
const office={id:'office',name:'Office friends'},family={id:'family',name:'Family'};
const data={
  guests:[
    {id:'a',name:'Anita',party_size:3,event_ids:['wedding','reception'],tags:[office,family]},
    {id:'b',name:'Binu',party_size:2,event_ids:['wedding'],tags:[office]},
    {id:'c',name:'Chitra',party_size:4,event_ids:['reception'],tags:[]},
  ],
  tags:[office,family,{id:'unused',name:'School friends'}],
  events:[{id:'wedding',name:'Wedding'},{id:'reception',name:'Reception'}].map(event=>({...event,slug:event.id,date:'2026-11-15T05:00:00Z',time_label:'Morning',venue_name:null,venue_address:null,maps_url:null,directions_text:null})),
  responses:[{guest_id:'a',event_id:'wedding',attending:false,submitted_at:''}],
};
describe('Dashboard people cards',()=>{
  let role='full';
  beforeEach(()=>{role='full';TestBed.configureTestingModule({providers:[provideRouter([]),
    {provide:AdminAuthService,useValue:{role:()=>role}},
    {provide:AdminService,useValue:{dashboard:()=>of(data)}},
  ]});});
  it('replaces status cards with event and tag people totals while retaining the overall totals',async()=>{
    const fixture=TestBed.createComponent(Dashboard);await fixture.componentInstance.load();fixture.detectChanges();
    const root:HTMLElement=fixture.nativeElement;
    expect([...root.querySelectorAll('[aria-label="Invitation totals"] strong')].map(card=>card.textContent?.trim())).toEqual(['3','9']);
    expect(root.querySelector('[aria-label="Invitation totals"]')?.textContent).not.toMatch(/Confirmed|Declined|Pending/);
    expect([...root.querySelectorAll('.event-metrics .metric')].map(card=>[card.querySelector('h3')?.textContent,card.querySelector('strong')?.textContent])).toEqual([['Wedding','5'],['Reception','7']]);
    expect([...root.querySelectorAll('.tag-metrics .metric')].map(card=>[card.querySelector('h3')?.textContent,card.querySelector('strong')?.textContent])).toEqual([['Office friends','5'],['Family','3'],['School friends','0'],['Untagged','4']]);
    expect(root.textContent).toContain('tag totals can overlap');
  });
  it('follows event, tag and search filters without counting a party once for each event',async()=>{
    const component=TestBed.runInInjectionContext(()=>new Dashboard());await component.load();
    component.eventId.set('reception');
    expect(component.tagSummary().map(tag=>[tag.id,tag.peopleInvited])).toEqual([['office',3],['family',3],['unused',0],['untagged',4]]);
    component.tagId.set('office');expect(component.tagSummary()).toEqual([{...office,invited:1,peopleInvited:3,events:[{id:'reception',name:'Reception',peopleInvited:3}]}]);
    expect(component.eventSummary()[0].peopleInvited).toBe(3);
    component.search.set('Missing');expect(component.tagSummary()[0].peopleInvited).toBe(0);
    component.clearFilters();component.data.set({...data,responses:[]});expect(component.tagSummary()[0].peopleInvited).toBe(5);
  });
  it('renders total and per-event people for each tag, including zero and untagged groups',async()=>{
    const fixture=TestBed.createComponent(Dashboard);await fixture.componentInstance.load();fixture.detectChanges();
    const cards=[...fixture.nativeElement.querySelectorAll('.tag-metrics .metric')] as HTMLElement[];
    expect(cards[0].textContent).toContain('Total people invited');
    const breakdown=(card:HTMLElement)=>[...card.querySelectorAll('.tag-event-breakdown > div')].map(row=>[row.querySelector('dt')?.textContent,row.querySelector('dd')?.textContent]);
    expect(breakdown(cards[0])).toEqual([['Wedding','5'],['Reception','3']]);
    expect(breakdown(cards[1])).toEqual([['Wedding','3'],['Reception','3']]);
    expect(breakdown(cards[2])).toEqual([['Wedding','0'],['Reception','0']]);
    expect(breakdown(cards[3])).toEqual([['Wedding','0'],['Reception','4']]);
  });
  it('keeps tag totals unique across events and shows only the selected event breakdown',async()=>{
    const component=TestBed.runInInjectionContext(()=>new Dashboard());await component.load();
    expect(component.tagSummary()[1]).toMatchObject({peopleInvited:3,events:[{id:'wedding',peopleInvited:3},{id:'reception',peopleInvited:3}]});
    component.eventId.set('wedding');component.tagId.set('office');
    expect(component.tagSummary()[0]).toMatchObject({peopleInvited:5,events:[{id:'wedding',peopleInvited:5}]});
    component.search.set('Anita');expect(component.tagSummary()[0]).toMatchObject({peopleInvited:3,events:[{id:'wedding',peopleInvited:3}]});
  });
  it('does not expose private tag cards to restricted admins',async()=>{
    role='restricted';const fixture=TestBed.createComponent(Dashboard);await fixture.componentInstance.load();fixture.detectChanges();
    expect(fixture.componentInstance.tagSummary()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.tag-metrics')).toBeNull();
    expect(fixture.nativeElement.querySelector('.event-metrics')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Office friends');
  });
});
