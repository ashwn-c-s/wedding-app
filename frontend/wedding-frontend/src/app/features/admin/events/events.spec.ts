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
