import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Landing } from './landing';
import { ApiService } from '../../../core/services/api.service';
import { guestInvite, weddingEvent } from '../guest-test-data';

describe('Landing invitation loading', () => {
  const api = { getInvite: vi.fn(), getDefaultEvents: vi.fn() };
  async function setup(token?: string) {
    await TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { params: { token } }, paramMap: of(convertToParamMap(token ? {token} : {})) } }, { provide: ApiService, useValue: api }] }).compileComponents();
    const fixture = TestBed.createComponent(Landing); fixture.detectChanges(); return fixture;
  }
  beforeEach(() => { vi.resetAllMocks(); api.getDefaultEvents.mockReturnValue(of({venues: [weddingEvent]})); });
  it('renders the authorized guest and events', async () => {
    api.getInvite.mockReturnValue(of(guestInvite)); const fixture = await setup('11111111-1111-4111-8111-111111111111');
    expect(fixture.nativeElement.textContent).toContain('A Guest'); expect(fixture.componentInstance.events()).toEqual([weddingEvent]); expect(api.getDefaultEvents).not.toHaveBeenCalled();
  });
  it('uses the actual default-events response for an invalid invitation without guest data', async () => {
    api.getInvite.mockReturnValue(throwError(() => ({status: 404}))); const fixture = await setup('22222222-2222-4222-8222-222222222222');
    expect(api.getDefaultEvents).toHaveBeenCalledOnce(); expect(fixture.componentInstance.invite()).toBeNull(); expect(fixture.nativeElement.textContent).toContain('Wedding Hall'); expect(fixture.nativeElement.textContent).not.toContain('RSVP');
  });
  it('loads default events for a missing token', async () => { const fixture = await setup(); expect(api.getInvite).not.toHaveBeenCalled(); expect(fixture.componentInstance.events()).toEqual([weddingEvent]); });
  it('shows loading and allows retry after a network failure', async () => {
    const request = new Subject(); api.getInvite.mockReturnValue(request); const fixture = await setup('11111111-1111-4111-8111-111111111111');
    expect(fixture.nativeElement.textContent).toContain('Loading your invitation'); request.error({status: 0}); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Try again');
    api.getInvite.mockReturnValue(of(guestInvite)); fixture.componentInstance.load(); fixture.detectChanges(); expect(fixture.componentInstance.error()).toBe(''); expect(fixture.componentInstance.invite()).toEqual(guestInvite);
  });
  it('does not render unsafe stored maps URLs', async () => { const fixture = await setup(); expect(fixture.componentInstance.getDirectionsUrl({...weddingEvent, maps_url: 'javascript:alert(1)'})).toContain('https://www.google.com/maps/search/'); });
  it('clears the previous private invite and cancels in-flight loads when the token changes', async () => {
    const params = new Subject<ReturnType<typeof convertToParamMap>>();
    const second = new Subject<typeof guestInvite>();
    const third = new Subject<typeof guestInvite>();
    api.getInvite.mockReturnValueOnce(of(guestInvite)).mockReturnValueOnce(second).mockReturnValueOnce(third);
    await TestBed.configureTestingModule({imports: [Landing], providers: [provideRouter([]), {provide: ActivatedRoute, useValue: {snapshot: {params: {}}, paramMap: params}}, {provide: ApiService, useValue: api}]}).compileComponents();
    const fixture = TestBed.createComponent(Landing);
    params.next(convertToParamMap({token: '11111111-1111-4111-8111-111111111111'})); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('A Guest');
    params.next(convertToParamMap({token: '22222222-2222-4222-8222-222222222222'})); fixture.detectChanges(); expect(fixture.componentInstance.invite()).toBeNull(); expect(fixture.nativeElement.textContent).not.toContain('A Guest');
    params.next(convertToParamMap({token: '33333333-3333-4333-8333-333333333333'})); second.next(guestInvite); expect(fixture.componentInstance.invite()).toBeNull();
    third.next({...guestInvite, guest: {...guestInvite.guest, name: 'Next Guest'}}); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Next Guest'); expect(api.getInvite).toHaveBeenLastCalledWith('33333333-3333-4333-8333-333333333333');
  });
  it('creates an all-day date range for date-only events and keeps the human schedule', async () => {
    const fixture = await setup();
    const calendar = new URL(fixture.componentInstance.getCalendarUrl({...weddingEvent, date: '2026-11-15', time_label: '10:00 AM onwards'}));
    expect(calendar.searchParams.get('dates')).toBe('20261115/20261116');
    expect(calendar.searchParams.get('ctz')).toBe('Asia/Kolkata'); expect(calendar.searchParams.get('details')).toContain('10:00 AM onwards');
  });

  it('displays event dates in India when a timestamp crosses the UTC day boundary', async () => {
    api.getDefaultEvents.mockReturnValue(of({venues: [{...weddingEvent, date: '2026-11-14T20:00:00Z'}]}));
    const fixture = await setup(); expect(fixture.nativeElement.textContent).toContain('Sunday, Nov 15, 2026');
  });
  it('preserves exact timestamp start times in calendar reminders', async () => {
    const fixture = await setup();
    const calendar = new URL(fixture.componentInstance.getCalendarUrl({...weddingEvent, date: '2026-11-15T05:00:00+00:00'}));
    expect(calendar.searchParams.get('dates')).toBe('20261115T050000Z/20261115T050000Z');
    expect(calendar.searchParams.get('ctz')).toBe('Asia/Kolkata');
  });

  it('treats the static endpoint name as a malformed token and never requests a private invite', async () => {
    const fixture = await setup('defaultevents');
    expect(api.getInvite).not.toHaveBeenCalled(); expect(api.getDefaultEvents).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.invite()).toBeNull(); expect(fixture.componentInstance.events()).toEqual([weddingEvent]);
  });

});
