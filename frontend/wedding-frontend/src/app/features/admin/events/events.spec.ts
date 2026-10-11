import { kolkataDateInput, kolkataTimestamp, validateEvent } from './events';
import { EventUpdate } from '../../../core/models/admin';
describe('Event editing validation',()=>{
  const event:EventUpdate={name:'Wedding',date:'2026-12-01',time_label:'Evening',venue_name:null,venue_address:null,maps_url:null,directions_text:null,is_visible:true};
  it('accepts optional empty venue information',()=>expect(validateEvent(event)).toBe(''));
  it('rejects malformed and nonexistent dates',()=>{expect(validateEvent({...event,date:'2026-02-30'})).toContain('date');expect(validateEvent({...event,date:''})).toContain('date');});
  it('rejects blank names and unsafe maps schemes',()=>{expect(validateEvent({...event,name:' '})).toContain('name');expect(validateEvent({...event,maps_url:'javascript:alert(1)'})).toContain('https');});
});

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Events } from './events';
import { AdminService } from '../../../core/services/admin.service';
describe('Event save integration',()=>{
  it('persists only supported editable fields and keeps relationships unchanged',async()=>{
    const event={id:'event-id',slug:'wedding',name:'Wedding',date:'2026-12-01',time_label:'Evening',venue_name:null,venue_address:null,maps_url:null,directions_text:null,is_visible:true};
    const api={events:vi.fn().mockReturnValue(of({events:[event]})),saveEvent:vi.fn().mockReturnValue(of({event:{...event,name:'Updated'}}))};
    TestBed.configureTestingModule({providers:[{provide:AdminService,useValue:api}]});
    const component=TestBed.runInInjectionContext(()=>new Events());await Promise.resolve();component.select(event.id);component.draft!.name=' Updated ';await component.save();expect(api.saveEvent).toHaveBeenCalledWith(event.id,{name:'Updated',date:event.date,time_label:'Evening',venue_name:null,venue_address:null,maps_url:null,directions_text:null,is_visible:true});expect(component.events()[0].name).toBe('Updated');expect(component.events()[0].slug).toBe('wedding');expect(component.notice()).toBe('Event saved.');
  });
});

describe('Existing timestamp event editing',()=>{
  it('shows the existing instant in Kolkata and validates ISO timestamps',()=>{
    expect(kolkataDateInput('2026-11-15T05:00:00+00:00')).toBe('2026-11-15T10:30:00');
    expect(kolkataTimestamp('2026-11-15T11:45')).toBe('2026-11-15T11:45:00+05:30');
    expect(kolkataTimestamp('2026-02-30T10:30')).toBe('');
  });
  it('preserves exact existing date/time during unrelated edits and converts edited local time',async()=>{
    const event={id:'event-id',slug:'wedding',name:'Wedding',date:'2026-11-15T05:00:00+00:00',time_label:'Morning',venue_name:null,venue_address:null,maps_url:null,directions_text:null,is_visible:true};
    const api={events:vi.fn().mockReturnValue(of({events:[event]})),saveEvent:vi.fn().mockImplementation((_id,update)=>of({event:{...event,...update}}))};
    TestBed.configureTestingModule({providers:[{provide:AdminService,useValue:api}]});
    const component=TestBed.runInInjectionContext(()=>new Events());await Promise.resolve();component.select(event.id);
    expect(component.dateInput).toBe('2026-11-15T10:30:00');component.draft!.name='New name';await component.save();
    expect(api.saveEvent.mock.calls[0][1].date).toBe(event.date);
    component.dateInput='2026-11-15T11:45';await component.save();expect(api.saveEvent.mock.calls[1][1].date).toBe('2026-11-15T11:45:00+05:30');
  });
});

describe('Event creation',()=>{
  it('creates an event with a slug and converts its India time without assigning guests automatically',async()=>{
    const api={events:vi.fn().mockReturnValue(of({events:[]})),createEvent:vi.fn().mockImplementation(event=>of({event:{...event,id:'new-event'}}))};TestBed.configureTestingModule({providers:[{provide:AdminService,useValue:api}]});const component=TestBed.runInInjectionContext(()=>new Events());await Promise.resolve();component.add();component.slug='family-dinner';component.draft!.name='Family dinner';component.dateInput='2026-11-14T18:00';await component.save();expect(api.createEvent.mock.calls[0][0]).toMatchObject({slug:'family-dinner',name:'Family dinner',date:'2026-11-14T18:00:00+05:30'});expect(component.events()).toHaveLength(1);expect(component.creating).toBe(false);expect(component.selectedId).toBe('new-event');expect(component.notice()).toContain('Assign it to guests');
  });
});

import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
describe('New event form rendering',()=>{
  it('renders required creation fields with an India-time date input',async()=>{
    const api={events:vi.fn().mockReturnValue(of({events:[]}))};await TestBed.configureTestingModule({imports:[Events],providers:[provideRouter([]),{provide:AdminService,useValue:api},{provide:AdminAuthService,useValue:{role:signal('full')}}]}).compileComponents();const fixture=TestBed.createComponent(Events);await fixture.componentInstance.load();fixture.componentInstance.add();fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();expect(fixture.nativeElement.querySelector('input[name="slug"]').required).toBe(true);expect(fixture.nativeElement.querySelector('input[type="datetime-local"]')).not.toBeNull();expect(fixture.nativeElement.textContent).toContain('Asia/Kolkata');expect(fixture.nativeElement.textContent).toContain('Guests are assigned separately');
  });
});
