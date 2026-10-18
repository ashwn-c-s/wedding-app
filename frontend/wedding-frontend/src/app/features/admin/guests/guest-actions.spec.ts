import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GuestLocationEditor } from '../guest-location-editor/guest-location-editor';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Guests } from './guests';
import { AdminService } from '../../../core/services/admin.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

const guest = {
  id: 'guest-id', name: 'Anita', phone: '+919876543210', party_size: 2,
  invite_token: 'invite-token', event_ids: ['wedding'], responses: [],
  tags: [{id: 'office', name: 'Office friends'}],
};
const event = {
  id: 'wedding', slug: 'wedding', name: 'Wedding Ceremony', date: '2026-11-15T05:00:00Z',
  time_label: 'Morning', venue_name: 'Wedding Hall', venue_address: null,
  maps_url: 'https://maps.app.goo.gl/wedding', directions_text: null,
};

describe('Guest list actions and identity', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [
      provideRouter([]),
      {provide: AdminAuthService, useValue: {role: () => 'full'}},
      {provide: AdminService, useValue: {
        guests: () => of({guests: [guest], tags: guest.tags}),
        events: () => of({events: [event]}),
        saveGuest: vi.fn().mockReturnValue(of({guest})),
      }},
    ]});
  });
  afterEach(() => vi.unstubAllGlobals());

  async function render() {
    const fixture = TestBed.createComponent(Guests);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('stacks identity details and exposes four named icon actions with a working editor', async () => {
    const fixture = await render();
    const table: HTMLTableElement = fixture.nativeElement.querySelector('.guest-table');
    expect([...table.querySelectorAll('th')].map(th => th.textContent?.trim())).toEqual(['Guest', 'Party size', 'Invited events', 'Actions']);
    const details = table.querySelector('.guest-details')!;
    expect([...details.children].map(child => child.textContent?.trim())).toEqual(['Anita', '+919876543210', 'Office friends']);
    const actions = [...table.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('.icon-action')];
    expect(actions.map(action => action.getAttribute('aria-label'))).toEqual([
      'Copy invitation for Anita',
      'WhatsApp invitation for Anita (opens in a new tab)',
      'Open invitation for Anita (opens in a new tab)',
      'Edit guest Anita',
    ]);
    for (const action of actions) {
      expect(action.getAttribute('title')).toBeTruthy();
      expect(action.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    }
    expect((actions[1] as HTMLAnchorElement).href).toContain('https://wa.me/919876543210');
    expect((actions[2] as HTMLAnchorElement).href).toContain('/invite/invite-token');
    actions[3].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input[name="guestName"]').value).toBe('Anita');
    expect(fixture.componentInstance.editingId).toBe('guest-id');
  });

  it('switches between cards and list without losing filters, guest actions or the edit draft', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('.view-toggle button');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.guest-list')?.classList.contains('view-cards')).toBe(true);
    fixture.componentInstance.search.set('Anita');
    fixture.componentInstance.tagFilter.set('office');
    fixture.componentInstance.edit(guest);
    fixture.componentInstance.draft!.name = 'Draft name';
    buttons[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector('.guest-list')?.classList.contains('view-list')).toBe(true);
    expect(root.querySelectorAll('.guest-table tbody tr')).toHaveLength(1);
    expect(root.querySelectorAll('.guest-table .icon-action')).toHaveLength(1);
    expect([...root.querySelectorAll('.guest-table th')].map(th => th.textContent?.trim())).toEqual(['Name', 'Phone', 'Party size', 'Invited events', 'Edit']);
    expect([...root.querySelectorAll('.guest-table tbody tr:first-child td')].map(td => td.textContent?.trim())).toEqual(['Anita', '+919876543210', '2', 'Wedding Ceremony', '']);
    expect(root.querySelector('.guest-tags')).toBeNull();
    expect(root.querySelector('.guest-list')?.getAttribute('tabindex')).toBe('0');
    expect(fixture.componentInstance.search()).toBe('Anita');
    expect(fixture.componentInstance.tagFilter()).toBe('office');
    expect(fixture.componentInstance.draft?.name).toBe('Draft name');
    buttons[0].click();
    fixture.detectChanges();
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.guest-list')?.classList.contains('view-cards')).toBe(true);
    expect(root.querySelectorAll('.guest-table .icon-action')).toHaveLength(4);
    expect(root.querySelector('.guest-tags')?.textContent).toContain('Office friends');
    fixture.componentInstance.search.set('No matching guest');
    buttons[1].click();
    fixture.detectChanges();
    expect(root.querySelector('.guest-table tbody')?.textContent).toContain('No guests match');
  });

  it('copies the same complete invitation as WhatsApp and announces success', async () => {
    const fixture = await render();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {clipboard: {writeText}});
    fixture.nativeElement.querySelector('[title="Copy invitation"]').click();
    await fixture.whenStable();
    fixture.detectChanges();
    const whatsapp: HTMLAnchorElement = fixture.nativeElement.querySelector('[title="WhatsApp"]');
    expect(writeText).toHaveBeenCalledWith(new URL(whatsapp.href).searchParams.get('text'));
    expect(writeText.mock.calls[0][0]).toContain('Wedding Ceremony');
    expect(writeText.mock.calls[0][0]).toContain('10:30 am IST');
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Invitation copied for Anita.');
  });

  it('opens the guest editor from the list pencil button', async () => {
    const fixture = await render();
    fixture.componentInstance.viewMode.set('list');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.guest-table [title="Edit guest"]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.editingId).toBe(guest.id);
    expect(fixture.nativeElement.querySelector('input[name="guestName"]').value).toBe(guest.name);
  });

  it('includes optional location in the guest save, blocks invalid/pending input, and can clear it', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    fixture.nativeElement.querySelector('.guest-table [title="Edit guest"]').click(); fixture.detectChanges(); await fixture.whenStable();
    const editor: GuestLocationEditor = fixture.debugElement.query(By.directive(GuestLocationEditor)).componentInstance;
    const api = TestBed.inject(AdminService);
    editor.type='coordinates'; editor.latitude=91; editor.longitude=76; editor.update();
    await component.save(); expect(api.saveGuest).not.toHaveBeenCalled();
    editor.latitude=10.5; editor.update();
    component.locating.set(true); await component.save(); expect(api.saveGuest).not.toHaveBeenCalled();
    component.locating.set(false); await component.save();
    expect(api.saveGuest).toHaveBeenCalledWith(guest.id,expect.objectContaining({location:{type:'coordinates',latitude:10.5,longitude:76,accuracy_m:null,address:null}}));
    const location = {type:'maps' as const,maps_url:'https://maps.app.goo.gl/home'};
    component.guests.set([{...guest,location}]); fixture.detectChanges();
    fixture.nativeElement.querySelector('.guest-table [title="Edit guest"]').click();
    fixture.detectChanges(); await fixture.whenStable();
    expect(component.draft?.location).toEqual(location);
    const resetEditor:GuestLocationEditor=fixture.debugElement.query(By.directive(GuestLocationEditor)).componentInstance;
    resetEditor.clear(); await component.save();
    expect(api.saveGuest).toHaveBeenLastCalledWith(guest.id,expect.objectContaining({location:null}));
  });

  it('shows a private Maps pin on cards only when a guest has a saved location', async () => {
    const fixture = await render();
    fixture.componentInstance.guests.set([{...guest,location:{type:'coordinates',latitude:10.5,longitude:76.2}}]);
    fixture.detectChanges();
    const pin:HTMLAnchorElement=fixture.nativeElement.querySelector('[title="Guest location"]');
    expect(pin.href).toContain('query=10.5,76.2');
    expect(pin.getAttribute('aria-label')).toContain('Open guest location for Anita');
    fixture.componentInstance.viewMode.set('list');fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[title="Guest location"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.guest-table th')).toHaveLength(5);
  });

  it('reports clipboard failure without claiming the invitation was copied', async () => {
    const fixture = await render();
    vi.stubGlobal('navigator', {clipboard: {writeText: vi.fn().mockRejectedValue(new Error('blocked'))}});
    fixture.componentInstance.notice.set('Invitation copied for an earlier guest.');
    await fixture.componentInstance.copy(guest);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Clipboard access failed');
    expect(fixture.componentInstance.notice()).toBe('');
  });
});
