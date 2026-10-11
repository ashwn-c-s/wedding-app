import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RsvpForm } from './rsvp-form';
import { ApiService } from '../../../core/services/api.service';
import { guestInvite } from '../guest-test-data';

describe('RSVP workflow', () => {
  const api = { getInvite: vi.fn(), getRsvpStatus: vi.fn(), submitRsvp: vi.fn() };
  beforeEach(async () => {
    vi.resetAllMocks(); api.getInvite.mockReturnValue(of(guestInvite)); api.getRsvpStatus.mockReturnValue(of({submitted: false, responses: []}));
    await TestBed.configureTestingModule({ imports: [RsvpForm], providers: [provideRouter([]), {provide: ActivatedRoute, useValue: {snapshot: {params: {token: '11111111-1111-4111-8111-111111111111'}}, paramMap: of(convertToParamMap({token: '11111111-1111-4111-8111-111111111111'}))}}, {provide: ApiService, useValue: api}] }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  function create() { const fixture = TestBed.createComponent(RsvpForm); fixture.detectChanges(); return fixture; }
  it('requires an explicit choice for every permitted event', () => { const fixture = create(); fixture.componentInstance.review(); fixture.detectChanges(); expect(fixture.componentInstance.reviewing()).toBe(false); expect(fixture.nativeElement.textContent).toContain('Please choose a response'); expect(api.submitRsvp).not.toHaveBeenCalled(); });
  it('accepts a decline and requires review before submitting only authorized events', () => {
    api.submitRsvp.mockReturnValue(of({success: true})); const component = create().componentInstance;
    component.choose('event-1', false); component.choose('unauthorized-event', true); component.submit(); expect(api.submitRsvp).not.toHaveBeenCalled();
    component.review(); component.submit(); expect(api.submitRsvp).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', [{event_id: 'event-1', attending: false}]); expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/invite', '11111111-1111-4111-8111-111111111111', 'rsvp', 'confirmed']);
  });
  it('prevents duplicate submissions while saving', () => { api.submitRsvp.mockReturnValue(new Subject()); const component = create().componentInstance; component.choose('event-1', true); component.review(); component.submit(); component.submit(); expect(api.submitRsvp).toHaveBeenCalledOnce(); expect(component.submitting()).toBe(true); });
  it('reopens persisted confirmation after a page refresh', () => { api.getRsvpStatus.mockReturnValue(of({submitted: true, responses: [{event_id: 'event-1', attending: true}]})); create(); expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/invite', '11111111-1111-4111-8111-111111111111', 'rsvp', 'confirmed']); });
  it('shows a retryable submission error while retaining reviewed choices', () => { api.submitRsvp.mockReturnValue(throwError(() => ({status: 500}))); const component = create().componentInstance; component.choose('event-1', true); component.review(); component.submit(); expect(component.error()).toContain('could not be saved'); expect(component.submitting()).toBe(false); expect(component.reviewing()).toBe(true); });
  it('uses confirmation when the server reports an existing locked RSVP', () => { api.submitRsvp.mockReturnValue(throwError(() => ({status: 409}))); const component = create().componentInstance; component.choose('event-1', true); component.review(); component.submit(); expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/invite', '11111111-1111-4111-8111-111111111111', 'rsvp', 'confirmed']); });
  it('resets responses and review when Angular reuses the route for another invite', () => {
    const params = new BehaviorSubject(convertToParamMap({token: '11111111-1111-4111-8111-111111111111'}));
    const route = TestBed.inject(ActivatedRoute); Object.defineProperty(route, 'paramMap', {value: params});
    const component = create().componentInstance; component.choose('event-1', true); component.review();
    params.next(convertToParamMap({token: '22222222-2222-4222-8222-222222222222'}));
    expect(component.token).toBe('22222222-2222-4222-8222-222222222222'); expect(component.selections()).toEqual({}); expect(component.reviewing()).toBe(false);
  });

});
