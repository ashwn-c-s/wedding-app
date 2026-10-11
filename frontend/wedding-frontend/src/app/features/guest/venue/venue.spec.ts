import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Venue } from './venue';
import { ApiService } from '../../../core/services/api.service';
import { weddingEvent } from '../guest-test-data';

describe('Venue details', () => {
  it('displays permitted event venue, address, timing and directions', async () => {
    await TestBed.configureTestingModule({imports: [Venue], providers: [provideRouter([]), {provide: ActivatedRoute, useValue: {snapshot: {params: {token: '11111111-1111-4111-8111-111111111111'}}, paramMap: of(convertToParamMap({token: '11111111-1111-4111-8111-111111111111'}))}}, {provide: ApiService, useValue: {getVenues: () => of({venues: [weddingEvent]})}}]}).compileComponents();
    const fixture = TestBed.createComponent(Venue); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Wedding Hall'); expect(fixture.nativeElement.textContent).toContain('Ottapalam'); expect(fixture.nativeElement.textContent).toContain('11 AM'); expect(fixture.nativeElement.querySelector('main a').href).toContain('google.com/maps/search');
  });
  it('uses public venues without RSVP links for an inaccessible invitation', async () => {
    const defaults = vi.fn(() => of({venues: [{...weddingEvent, venue_name: null, venue_address: null}]}));
    await TestBed.configureTestingModule({imports: [Venue], providers: [provideRouter([]), {provide: ActivatedRoute, useValue: {snapshot: {params: {token: '11111111-1111-4111-8111-111111111111'}}, paramMap: of(convertToParamMap({token: '11111111-1111-4111-8111-111111111111'}))}}, {provide: ApiService, useValue: {getVenues: () => throwError(() => ({status: 403})), getDefaultEvents: defaults}}]}).compileComponents();
    const fixture = TestBed.createComponent(Venue); fixture.detectChanges(); expect(defaults).toHaveBeenCalledOnce(); expect(fixture.nativeElement.textContent).toContain('Venue to be announced'); expect(fixture.nativeElement.textContent).not.toContain('RSVP');
  });
});
