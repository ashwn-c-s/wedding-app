import { AdminAccessState, AdminAccessUnavailable } from './admin-access-state';
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
  it('requires an explicit backend administrator role', async () => {const result=auth.authorize();await Promise.resolve();await Promise.resolve();http.expectOne(`${environment.apiBaseUrl}/api/admin/session`).flush({role:'full'});expect(await result).toBe(true);expect(auth.role()).toBe('full');});
  it('rejects authenticated users with unknown roles', async () => {const result=auth.authorize();await Promise.resolve();await Promise.resolve();http.expectOne(`${environment.apiBaseUrl}/api/admin/session`).flush({role:'viewer'});expect(await result).toBe(false);expect(auth.role()).toBeNull();});
  it('clears stale authorization when session verification fails', async () => {auth.role.set('full');const result=auth.authorize();await Promise.resolve();await Promise.resolve();http.expectOne(`${environment.apiBaseUrl}/api/admin/session`).flush({error:'expired'},{status:401,statusText:'Unauthorized'});expect(await result).toBe(false);expect(auth.role()).toBeNull();});
  it('does not call the backend without an authenticated session', async () => {vi.mocked(auth.accessToken).mockResolvedValue(null);expect(await auth.authorize()).toBe(false);http.expectNone(`${environment.apiBaseUrl}/api/admin/session`);});
});

describe('Temporary admin access outages',()=>{
  it('preserves the session and offers recovery when role verification is unavailable',async()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
    const auth=TestBed.inject(AdminAuthService);const http=TestBed.inject(HttpTestingController);
    const access=TestBed.inject(AdminAccessState);
    vi.spyOn(auth,'accessToken').mockResolvedValue('jwt');const logout=vi.spyOn(auth,'logout');
    const verification=auth.authorize();const failed=expect(verification).rejects.toBeInstanceOf(AdminAccessUnavailable);
    expect(access.checking()).toBe(true);
    await Promise.resolve();await Promise.resolve();
    http.expectOne(`${environment.apiBaseUrl}/api/admin/session`).flush({error:'unavailable'},{status:503,statusText:'Unavailable'});
    await failed;expect(logout).not.toHaveBeenCalled();expect(auth.role()).toBeNull();expect(access.checking()).toBe(false);expect(access.error()).toContain('session has been kept');
    const retry=auth.authorize();await Promise.resolve();await Promise.resolve();
    http.expectOne(`${environment.apiBaseUrl}/api/admin/session`).flush({role:'full'});
    expect(await retry).toBe(true);expect(access.error()).toBe('');http.verify();
  });
});
