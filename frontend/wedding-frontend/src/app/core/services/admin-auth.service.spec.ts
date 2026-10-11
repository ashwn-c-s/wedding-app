import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { AdminAuthService } from './admin-auth.service';
import { environment } from '../../../environments/environment';
describe('Admin session authorization', () => {
  let auth: AdminAuthService; let http: HttpTestingController;
  beforeEach(() => {TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});auth=TestBed.inject(AdminAuthService);http=TestBed.inject(HttpTestingController);vi.spyOn(auth,'accessToken').mockResolvedValue('jwt');});
  afterEach(()=>http.verify());
  it('requires an explicit backend administrator role', async () => {const result=auth.authorize();await Promise.resolve();http.expectOne(`${environment.apiBaseUrl}/api/admin/session`).flush({role:'full'});expect(await result).toBe(true);expect(auth.role()).toBe('full');});
  it('rejects authenticated users with unknown roles', async () => {const result=auth.authorize();await Promise.resolve();http.expectOne(`${environment.apiBaseUrl}/api/admin/session`).flush({role:'viewer'});expect(await result).toBe(false);expect(auth.role()).toBeNull();});
  it('clears stale authorization when session verification fails', async () => {auth.role.set('full');const result=auth.authorize();await Promise.resolve();http.expectOne(`${environment.apiBaseUrl}/api/admin/session`).flush({error:'expired'},{status:401,statusText:'Unauthorized'});expect(await result).toBe(false);expect(auth.role()).toBeNull();});
  it('does not call the backend without an authenticated session', async () => {vi.mocked(auth.accessToken).mockResolvedValue(null);expect(await auth.authorize()).toBe(false);http.expectNone(`${environment.apiBaseUrl}/api/admin/session`);});
});
