import { AdminAccessState, AdminAccessUnavailable } from '../services/admin-access-state';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { vi } from 'vitest';
import { adminGuard, fullAdminGuard } from './admin.guard';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminRole } from '../models/admin';
describe('Administrator route guards',()=>{
  const auth={authorize:vi.fn(),role:signal<AdminRole|null>(null)};
  beforeEach(()=>{auth.authorize.mockReset();auth.role.set(null);TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AdminAuthService,useValue:auth}]});});
  it('redirects unauthenticated sessions to login with a local return route',async()=>{auth.authorize.mockResolvedValue(false);const result=await TestBed.runInInjectionContext(()=>adminGuard({} as ActivatedRouteSnapshot,{url:'/admin/guests'} as RouterStateSnapshot));expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/admin/login?returnUrl=%2Fadmin%2Fguests');});
  it('allows backend-verified authenticated administrators',async()=>{auth.authorize.mockResolvedValue(true);expect(await TestBed.runInInjectionContext(()=>adminGuard({} as ActivatedRouteSnapshot,{url:'/admin/dashboard'} as RouterStateSnapshot))).toBe(true);});
  it('cancels navigation on a temporary outage without redirecting to login',async()=>{
    auth.authorize.mockRejectedValue(new AdminAccessUnavailable());
    const result=await TestBed.runInInjectionContext(()=>adminGuard({} as ActivatedRouteSnapshot,{url:'/admin/guests'} as RouterStateSnapshot));
    expect(result).toBe(false);expect(TestBed.inject(AdminAccessState).target()).toBe('/admin/guests');
  });
  it('keeps restricted administrators out of full-role routes',async()=>{auth.role.set('restricted');const result=await TestBed.runInInjectionContext(()=>fullAdminGuard({} as ActivatedRouteSnapshot,{} as RouterStateSnapshot));expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/admin/dashboard');});
});
