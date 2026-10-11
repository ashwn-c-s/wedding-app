import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { weddingEvent } from '../../features/guest/guest-test-data';

describe('Guest API contracts', () => {
  beforeEach(() => TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]}));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('reads the public endpoint venues envelope', () => {
    TestBed.inject(ApiService).getDefaultEvents().subscribe(result => expect(result.venues).toEqual([weddingEvent]));
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/api/invite/defaultevents`); expect(request.request.method).toBe('GET'); request.flush({venues: [weddingEvent]});
  });
  it('submits the supported response fields to the invitation endpoint', () => {
    TestBed.inject(ApiService).submitRsvp('11111111-1111-4111-8111-111111111111', [{event_id: 'event-1', attending: false}]).subscribe(result => expect(result.success).toBe(true));
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/api/invite/11111111-1111-4111-8111-111111111111/rsvp`); expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual({responses: [{event_id: 'event-1', attending: false}]}); request.flush({success: true});
  });
  it('rejects a public envelope returned in place of a personalized invitation', () => {
    let failure: unknown;
    TestBed.inject(ApiService).getInvite('11111111-1111-4111-8111-111111111111').subscribe({error: error => failure = error});
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/api/invite/11111111-1111-4111-8111-111111111111`).flush({venues: [weddingEvent]});
    expect(failure).toBeInstanceOf(Error);
  });
  it('rejects a default response with no event array', () => {
    let failure: unknown;
    TestBed.inject(ApiService).getDefaultEvents().subscribe({error: error => failure = error});
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/api/invite/defaultevents`).flush({});
    expect(failure).toBeInstanceOf(Error);
  });

});
