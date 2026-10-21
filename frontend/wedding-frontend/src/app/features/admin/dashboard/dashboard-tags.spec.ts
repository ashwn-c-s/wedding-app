import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { AdminService } from '../../../core/services/admin.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
const office = { id: 'office', name: 'Office friends' },
  school = { id: 'school', name: 'School friends' };
const data = {
  guests: [
    { id: 'a', name: 'Anita', party_size: 3, event_ids: ['event'], tags: [office, school] },
    { id: 'b', name: 'Other', party_size: 2, event_ids: ['event'], tags: [] },
  ],
  events: [{ id: 'event', name: 'Wedding' }],
  responses: [{ guest_id: 'a', event_id: 'event', attending: true, submitted_at: '' }],
  tags: [office, school],
};
describe('Tag-aware attendance and export', () => {
  it('combines tag and event filters without duplicating a multi-tag guest', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: { dashboard: () => of(data) } },
        { provide: AdminAuthService, useValue: { role: () => 'full' } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new Dashboard());
    await Promise.resolve();
    component.tagIds.set(['office']);
    component.eventId.set('event');
    expect(component.rows()).toHaveLength(1);
    expect(component.summary().peopleInvited).toBe(3);
    expect(component.eventSummary()[0].peopleInvited).toBe(3);
    expect(component.exportRows()[1].at(-1)).toBe('Office friends|School friends');
    component.tagIds.set(['untagged']);
    expect(component.summary().pending).toBe(1);
    expect(component.rows()[0].guestId).toBe('b');
  });
  it('restricted admins cannot use private tag filters or export tag labels', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: { dashboard: () => of(data) } },
        { provide: AdminAuthService, useValue: { role: () => 'restricted' } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new Dashboard());
    await Promise.resolve();
    component.tagIds.set(['office', 'school']);
    expect(component.rows()).toHaveLength(2);
    expect(component.exportRows()[0]).not.toContain('Tags');
  });
  it('matches any selected tag, combines Untagged, and counts overlapping parties once in totals and CSV',async()=>{
    TestBed.configureTestingModule({providers:[
      {provide:AdminService,useValue:{dashboard:()=>of(data)}},
      {provide:AdminAuthService,useValue:{role:()=> 'full'}},
    ]});
    const component=TestBed.runInInjectionContext(()=>new Dashboard());await component.load();
    component.data.update(value=>({...value,guests:[...value.guests,{id:'c',name:'School only',party_size:4,event_ids:['event'],tags:[school]}]}));
    component.toggleTag('office',true);component.toggleTag('school',true);component.toggleTag('office',true);
    expect(component.tagIds()).toEqual(['office','school']);
    expect(component.summary()).toMatchObject({invited:2,peopleInvited:7});
    expect(component.eventSummary()[0]).toMatchObject({invited:2,peopleInvited:7});
    expect(component.exportRows()).toHaveLength(3);
    expect(component.tagSummary().map(tag=>[tag.id,tag.peopleInvited])).toEqual([['office',3],['school',7]]);
    component.toggleTag('untagged',true);expect(component.summary()).toMatchObject({invited:3,peopleInvited:9});
    component.search.set('School only');component.eventId.set('event');expect(component.summary().peopleInvited).toBe(4);
    component.toggleTag('school',false);expect(component.summary().peopleInvited).toBe(0);
    component.clearFilters();expect(component.tagIds()).toEqual([]);expect(component.summary().peopleInvited).toBe(9);
  });
  it('lets users select multiple tag checkboxes, close with Escape and clear just the tag selection',async()=>{
    TestBed.configureTestingModule({providers:[provideRouter([]),
      {provide:AdminService,useValue:{dashboard:()=>of(data)}},
      {provide:AdminAuthService,useValue:{role:()=> 'full'}},
    ]});
    const fixture=TestBed.createComponent(Dashboard);await fixture.componentInstance.load();fixture.detectChanges();await fixture.whenStable();
    const details:HTMLDetailsElement=fixture.nativeElement.querySelector('.tag-filter details');
    const summary:HTMLElement=details.querySelector('summary')!;summary.click();
    const inputs=details.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    inputs[0].click();inputs[1].click();await fixture.whenStable();fixture.detectChanges();
    expect(inputs[0].checked).toBe(true);expect(inputs[1].checked).toBe(true);
    expect(fixture.componentInstance.tagIds()).toEqual(['office','school']);
    expect(summary.textContent).toContain('Office friends');expect(summary.textContent).toContain('School friends');
    details.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(details.open).toBe(false);
    fixture.componentInstance.search.set('Anita');details.querySelector('button')!.click();fixture.detectChanges();
    expect(fixture.componentInstance.tagIds()).toEqual([]);expect(fixture.componentInstance.search()).toBe('Anita');
    expect(summary.textContent).toContain('All tags');
  });

});
