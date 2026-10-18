import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Guests } from './guests';
import { AdminService } from '../../../core/services/admin.service';
import { ImportReport } from '../../../core/models/admin';
describe('Guest import feedback', () => {
  const api = {
    guests: vi.fn(),
    events: vi.fn().mockReturnValue(of({ events: [] })),
    importGuests: vi.fn(),
  };
  beforeEach(() => {
    api.guests.mockReset().mockReturnValue(of({ guests: [] }));
    api.importGuests.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: AdminService, useValue: api }] });
  });
  it('shows per-row partial results and reloads saved guests exactly once', async () => {
    const report: ImportReport = {
      created: 1,
      updated: 0,
      failed: 1,
      results: [
        { row: 2, status: 'created' },
        { row: 3, status: 'error', message: 'Unknown event' },
      ],
    };
    api.importGuests.mockReturnValue(of(report));
    const component = TestBed.runInInjectionContext(() => new Guests());
    await Promise.resolve();
    component.csv = 'name,phone,party_size,events\nA,+919876543210,2,wedding';
    await component.importCsv();
    expect(api.importGuests).toHaveBeenCalledWith(component.csv);
    expect(component.report()).toEqual(report);
    expect(api.guests).toHaveBeenCalledTimes(2);
    expect(component.importing()).toBe(false);
  });
  it('does not send an empty CSV to the backend', async () => {
    const component = TestBed.runInInjectionContext(() => new Guests());
    await component.importCsv();
    expect(api.importGuests).not.toHaveBeenCalled();
    expect(component.error()).toContain('CSV');
  });
});

describe('Guest editor', () => {
  const guest = {
    id: 'guest-id',
    name: 'Existing',
    phone: '123',
    party_size: 2,
    invite_token: 'same-token',
    event_ids: ['event-id'],
    responses: [],
  };
  const api = { guests: vi.fn(), events: vi.fn(), createGuest: vi.fn(), saveGuest: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.guests.mockReturnValue(of({ guests: [guest] }));
    api.events.mockReturnValue(of({ events: [{ id: 'event-id', name: 'Wedding' }] }));
    TestBed.configureTestingModule({ providers: [{ provide: AdminService, useValue: api }] });
  });
  it('shares only assigned and visible events in the WhatsApp draft', async () => {
    const component = TestBed.runInInjectionContext(() => new Guests());
    await component.load();
    const base = {slug:'wedding',date:'2026-11-15T05:00:00Z',time_label:'Morning',venue_name:null,venue_address:null,maps_url:null,directions_text:null};
    component.events.set([
      {...base,id:'event-id',name:'Invited Wedding'},
      {...base,id:'other',name:'Unassigned Event'},
      {...base,id:'hidden',name:'Hidden Event',is_visible:false},
    ]);
    const text = new URL(component.whatsapp({...guest,event_ids:['event-id','hidden']})).searchParams.get('text');
    expect(text).toContain('*Invited Wedding*');
    expect(text).not.toContain('Unassigned Event');
    expect(text).not.toContain('Hidden Event');
    expect(text).toContain('/invite/same-token');
  });
  it('creates a guest with selected events and displays the shareable result', async () => {
    api.createGuest.mockReturnValue(of({ guest: { ...guest, id: 'new-id', name: 'New' } }));
    const component = TestBed.runInInjectionContext(() => new Guests());
    await component.load();
    component.add();
    component.draft!.name = ' New ';
    component.draft!.phone = '456';
    component.toggleEvent('event-id', true);
    await component.save();
    expect(api.createGuest).toHaveBeenCalledWith({
      name: 'New',
      phone: '456',
      party_size: 1,
      event_ids: ['event-id'],
    });
    expect(component.guests()).toHaveLength(2);
    expect(component.draft).toBeNull();
  });
  it('edits a copy, preserves the invitation and locks assignments after RSVP', async () => {
    const confirmed = { ...guest, responses: [{ event_id: 'event-id', attending: true }] };
    api.saveGuest.mockReturnValue(of({ guest: { ...confirmed, name: 'Updated' } }));
    const component = TestBed.runInInjectionContext(() => new Guests());
    await component.load();
    component.edit(confirmed);
    component.draft!.name = 'Updated';
    component.toggleEvent('other-event', true);
    expect(component.draft!.event_ids).toEqual(['event-id']);
    expect(guest.name).toBe('Existing');
    await component.save();
    expect(api.saveGuest).toHaveBeenCalledWith('guest-id', {
      name: 'Updated',
      phone: '123',
      party_size: 2,
      event_ids: ['event-id'],
    });
    expect(component.guests()[0].invite_token).toBe('same-token');
  });
  it('does not submit a guest with no assigned event', async () => {
    const component = TestBed.runInInjectionContext(() => new Guests());
    component.add();
    component.draft!.name = 'New';
    component.draft!.phone = '123';
    await component.save();
    expect(api.createGuest).not.toHaveBeenCalled();
    expect(component.error()).toContain('select at least one event');
  });
});

import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
describe('Guest form rendering and recovery', () => {
  it('renders event checkboxes and disables them for a submitted guest', async () => {
    const guest = {
      id: 'guest-id',
      name: 'Confirmed',
      phone: '123',
      party_size: 2,
      invite_token: 'token',
      event_ids: ['event-id'],
      responses: [{ event_id: 'event-id', attending: true }],
    };
    const api = {
      guests: vi.fn().mockReturnValue(of({ guests: [guest] })),
      events: vi
        .fn()
        .mockReturnValue(of({ events: [{ id: 'event-id', name: 'Reception', is_visible: true }] })),
    };
    await TestBed.configureTestingModule({
      imports: [Guests],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: api },
        { provide: AdminAuthService, useValue: { role: signal('full') } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Guests);
    await fixture.componentInstance.load();
    fixture.componentInstance.edit(guest);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(checkbox.checked).toBe(true);
    expect(checkbox.closest('fieldset').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Reception');
    expect(fixture.nativeElement.textContent).toContain('invited events are locked');
  });
  it('shows a failed save immediately and preserves the draft until an explicit refresh', async () => {
    const api = {
      guests: vi.fn().mockReturnValue(of({ guests: [] })),
      events: vi.fn().mockReturnValue(of({ events: [] })),
      createGuest: vi
        .fn()
        .mockReturnValue(
          throwError(
            () =>
              new HttpErrorResponse({
                status: 503,
                error: { error: 'Unable to save guest. Nothing was changed.' },
              }),
          ),
        ),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AdminService, useValue: api }] });
    const component = TestBed.runInInjectionContext(() => new Guests());
    await component.load();
    component.add();
    component.draft = { name: 'A', phone: '123', party_size: 1, event_ids: ['event-id'] };
    await component.save();
    expect(component.error()).toBe('Unable to save guest. Nothing was changed.');
    expect(component.draft).toEqual({name:'A',phone:'123',party_size:1,event_ids:['event-id']});
    expect(component.saving()).toBe(false);
    expect(api.guests).toHaveBeenCalledTimes(2);
    expect(component.needsReconcile()).toBe(true);
  });
});
