import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { RsvpConfirmed } from './rsvp-confirmed';
import { ApiService } from '../../../core/services/api.service';
import { guestInvite } from '../guest-test-data';

describe('Persisted RSVP confirmation', () => {
  it('loads saved status from the backend on direct entry', async () => {
    const api = {getInvite: vi.fn(() => of(guestInvite)), getRsvpStatus: vi.fn(() => of({submitted: true, responses: [{event_id: 'event-1', attending: false}]}))};
    await TestBed.configureTestingModule({imports: [RsvpConfirmed], providers: [provideRouter([]), {provide: ActivatedRoute, useValue: {snapshot: {params: {token: '11111111-1111-4111-8111-111111111111'}}, paramMap: of(convertToParamMap({token: '11111111-1111-4111-8111-111111111111'}))}}, {provide: ApiService, useValue: api}]}).compileComponents();
    const fixture = TestBed.createComponent(RsvpConfirmed); fixture.detectChanges(); expect(api.getRsvpStatus).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111'); expect(fixture.nativeElement.textContent).toContain('Unable to attend'); expect(fixture.nativeElement.textContent).toContain('Wedding');
  });
  it('redirects an unsubmitted guest to the form', async () => {
    await TestBed.configureTestingModule({imports: [RsvpConfirmed], providers: [provideRouter([]), {provide: ActivatedRoute, useValue: {snapshot: {params: {token: '11111111-1111-4111-8111-111111111111'}}, paramMap: of(convertToParamMap({token: '11111111-1111-4111-8111-111111111111'}))}}, {provide: ApiService, useValue: {getInvite: () => of(guestInvite), getRsvpStatus: () => of({submitted: false, responses: []})}}]}).compileComponents();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true); TestBed.createComponent(RsvpConfirmed); expect(navigate).toHaveBeenCalledWith(['/invite', '11111111-1111-4111-8111-111111111111', 'rsvp']);
  });
});
