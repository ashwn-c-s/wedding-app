import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { DashboardV2 } from './dashboard-v2';
import { AdminService } from '../../../core/services/admin.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { DashboardData } from '../../../core/models/admin';

const family = { id: 'family', name: 'Family' };
const office = { id: 'office', name: 'Office friends' };
const event = (id: string, name: string) => ({
  id,
  name,
  slug: id,
  date: '2026-11-15T05:00:00Z',
  time_label: 'Morning',
  venue_name: null,
  venue_address: null,
  maps_url: null,
  directions_text: null,
  is_visible: true,
});
const data: DashboardData = {
  guests: [
    {
      id: 'a',
      name: 'Anita family',
      party_size: 3,
      event_ids: ['wedding', 'reception'],
      tags: [family, office],
    },
    { id: 'b', name: 'Binu', party_size: 2, event_ids: ['wedding'], tags: [office] },
    { id: 'c', name: 'Chitra', party_size: 4, event_ids: ['reception'], tags: [] },
    { id: 'd', name: 'Unassigned family', party_size: 5, event_ids: [], tags: [family] },
  ],
  tags: [family, office, { id: 'unused', name: 'Unused private group' }],
  events: [
    event('wedding', 'Wedding ceremony'),
    event('reception', 'Reception'),
    event('party', 'Evening party'),
  ],
  responses: [
    { guest_id: 'a', event_id: 'wedding', attending: false, submitted_at: '2026-10-21' },
    { guest_id: 'c', event_id: 'reception', attending: true, submitted_at: '2026-10-21' },
  ],
};

describe('Invitation overview v2', () => {
  let role: 'full' | 'restricted';
  let api: { dashboard: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    role = 'full';
    api = { dashboard: vi.fn(() => of(data)) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: api },
        { provide: AdminAuthService, useValue: { role: () => role } },
      ],
    });
  });

  const create = () => TestBed.runInInjectionContext(() => new DashboardV2());

  it('counts unique invitation parties and event headcounts independently of every RSVP response', async () => {
    const component = create();
    await component.load();
    const original = component.overview();
    expect(original.overall).toEqual({ invited: 4, peopleInvited: 14 });
    expect(original.filtered).toEqual({ invited: 4, peopleInvited: 14 });
    expect(original.events.map((item) => [item.id, item.invited, item.peopleInvited])).toEqual([
      ['wedding', 2, 5],
      ['reception', 2, 7],
      ['party', 0, 0],
    ]);
    expect(original.unassigned).toEqual({ invited: 1, peopleInvited: 5 });
    component.data.set({ ...data, responses: [] });
    expect(component.overview()).toEqual(original);
    component.data.set({
      ...data,
      responses: data.responses.map((response) => ({
        ...response,
        attending: !response.attending,
      })),
    });
    expect(component.overview()).toEqual(original);
  });

  it('matches any selected tag once, combines event and search filters, and retains the database-wide total', async () => {
    const component = create();
    await component.load();
    component.toggleTag('family', true);
    component.toggleTag('office', true);
    component.toggleTag('office', true);
    expect(component.tagIds()).toEqual(['family', 'office']);
    expect(component.overview().filtered).toEqual({ invited: 3, peopleInvited: 10 });
    component.eventId.set('reception');
    component.search.set('  ANITA  ');
    expect(component.overview().filtered).toEqual({ invited: 1, peopleInvited: 3 });
    expect(component.overview().overall.peopleInvited).toBe(14);
    expect(component.overview().events.map((item) => [item.id, item.peopleInvited])).toEqual([
      ['reception', 3],
    ]);
    expect(component.exportRows()).toEqual([
      ['Guest', 'Party size', 'Event', 'Tags'],
      ['Anita family', 3, 'Reception', 'Family|Office friends'],
    ]);
    component.clearFilters();
    expect(component.overview().filtered.peopleInvited).toBe(14);
    expect(component.search()).toBe('');
    expect(component.eventId()).toBe('');
    expect(component.tagIds()).toEqual([]);
  });

  it('includes untagged guests and shows tag contributions inside the matching event population', async () => {
    const component = create();
    await component.load();
    component.eventId.set('reception');
    const reception = component.overview().events[0];
    expect(reception.tags.map((tag) => [tag.id, tag.peopleInvited])).toEqual([
      ['family', 3],
      ['office', 3],
      ['untagged', 4],
    ]);
    expect(reception.tags.some((tag) => tag.id === 'unused')).toBe(false);
    component.toggleTag('untagged', true);
    expect(component.overview().filtered).toEqual({ invited: 1, peopleInvited: 4 });
    expect(component.overview().guests.map((guest) => guest.id)).toEqual(['c']);
  });

  it('keeps private tags out of restricted summaries, details, filter effects, and CSV', async () => {
    role = 'restricted';
    const fixture = TestBed.createComponent(DashboardV2);
    const component = fixture.componentInstance;
    await component.load();
    component.tagIds.set(['family']);
    fixture.detectChanges();
    expect(component.overview().filtered.peopleInvited).toBe(14);
    expect(component.overview().tags).toEqual([]);
    expect(component.overview().events.every((item) => item.tags.length === 0)).toBe(true);
    expect(component.overview().guests.every((guest) => !guest.tags?.length)).toBe(true);
    const rows = component.exportRows();
    expect(rows[0]).toEqual(['Guest', 'Party size', 'Event']);
    expect(rows.flat()).not.toContain('Office friends');
    expect(fixture.nativeElement.textContent).not.toContain('Office friends');
    expect(fixture.nativeElement.textContent).not.toContain('Unused private group');
  });

  it('does not present invitation totals or false empty states when the initial read fails, and supports retry', async () => {
    api.dashboard.mockImplementation(() => throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(DashboardV2);
    const component = fixture.componentInstance;
    await component.load();
    fixture.detectChanges();
    expect(component.read.loaded()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load',
    );
    expect(fixture.nativeElement.querySelector('.event-card')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No invitations');
    api.dashboard.mockImplementation(() => of(data));
    const retry: HTMLButtonElement = fixture.nativeElement.querySelector('.read-toolbar button');
    expect(retry.textContent?.trim()).toBe('Retry');
    retry.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.read.loaded()).toBe(true);
    expect(component.overview().overall.peopleInvited).toBe(14);
  });

  it('retains loaded headcounts and selected filters through a failed refresh', async () => {
    const fixture = TestBed.createComponent(DashboardV2);
    const component = fixture.componentInstance;
    await component.load();
    component.eventId.set('wedding');
    component.search.set('Anita');
    fixture.detectChanges();
    const waiting = new Subject<DashboardData>();
    api.dashboard.mockReturnValue(waiting);
    const refreshing = component.load();
    fixture.detectChanges();
    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.querySelector('.event-card')?.textContent).toContain(
      'Wedding ceremony',
    );
    expect(component.overview().filtered.peopleInvited).toBe(3);
    waiting.error(new Error('offline'));
    await refreshing;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Showing previously loaded data');
    expect(component.overview().filtered.peopleInvited).toBe(3);
    expect(component.eventId()).toBe('wedding');
    expect(component.search()).toBe('Anita');
  });

  it('starts guest details and event tag breakdowns collapsed', async () => {
    const fixture = TestBed.createComponent(DashboardV2);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('.guest-details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    const breakdowns = [
      ...fixture.nativeElement.querySelectorAll('.breakdown'),
    ] as HTMLDetailsElement[];
    expect(breakdowns).toHaveLength(3);
    expect(breakdowns.every((item) => !item.open)).toBe(true);
  });

  it('exports invitation data without response columns and includes an unassigned party once', async () => {
    const component = create();
    await component.load();
    const rows = component.exportRows();
    expect(rows[0]).toEqual(['Guest', 'Party size', 'Event', 'Tags']);
    expect(rows).toHaveLength(6);
    expect(rows.filter((row) => row[0] === 'Unassigned family')).toHaveLength(1);
    expect(rows[0]).not.toContain('Response');
    expect(rows[0]).not.toContain('Submitted at');
  });
});

describe('Invitation overview production routes', () => {
  it('promotes the modern overview and preserves v2 bookmarks and default redirects', async () => {
    const { routes } = await import('../../../app.routes');
    const { adminGuard } = await import('../../../core/guards/admin.guard');
    const legacy = routes.find((route) => route.path === 'admin/dashboard')!;
    const modern = routes.find((route) => route.path === 'admin/dashboard-v2')!;
    expect(await legacy.loadComponent!()).toBe(DashboardV2);
    expect(modern.redirectTo).toBe('admin/dashboard');
    expect(modern.pathMatch).toBe('full');
    expect(legacy.canActivate).toContain(adminGuard);
    expect(routes.find((route) => route.path === 'admin')?.redirectTo).toBe('admin/dashboard');
    expect(routes.find((route) => route.path === 'admin/rsvps')?.redirectTo).toBe(
      'admin/dashboard',
    );
  });
});
