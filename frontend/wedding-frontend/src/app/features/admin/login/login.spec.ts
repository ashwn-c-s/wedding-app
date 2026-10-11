import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { Login } from './login';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
describe('Admin login',()=>{
  const auth={login:vi.fn()};
  beforeEach(()=>{auth.login.mockReset();TestBed.configureTestingModule({imports:[Login],providers:[provideRouter([]),{provide:AdminAuthService,useValue:auth},{provide:ActivatedRoute,useValue:{snapshot:{queryParamMap:convertToParamMap({returnUrl:'https://external.example'})}}}]});});
  it('validates credentials before attempting authentication',async()=>{const component=TestBed.createComponent(Login).componentInstance;await component.submit();expect(auth.login).not.toHaveBeenCalled();expect(component.error()).toContain('email and password');});
  it('blocks external return URLs after successful authentication',async()=>{auth.login.mockResolvedValue(undefined);const router=TestBed.inject(Router);const navigate=vi.spyOn(router,'navigateByUrl').mockResolvedValue(true);const component=TestBed.createComponent(Login).componentInstance;component.email='admin@example.com';component.password='password';await component.submit();expect(navigate).toHaveBeenCalledWith('/admin/dashboard');expect(component.password).toBe('');});
  it('shows authentication failures',async()=>{auth.login.mockRejectedValue(new Error('Unauthorized account'));const component=TestBed.createComponent(Login).componentInstance;component.email='admin@example.com';component.password='password';await component.submit();expect(component.error()).toBe('Unauthorized account');expect(component.busy()).toBe(false);});
});
