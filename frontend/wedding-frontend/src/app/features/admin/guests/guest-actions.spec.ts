import { TestBed } from '@angular/core/testing';
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
