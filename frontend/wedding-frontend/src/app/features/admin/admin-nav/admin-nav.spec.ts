import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminNav } from './admin-nav';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

describe('Production admin navigation', () => {
  let role: 'full' | 'restricted';
  const logout = vi.fn();
  beforeEach(() => {
    role = 'full';
    logout.mockReset();
    TestBed.configureTestingModule({
      imports: [AdminNav],
      providers: [
        provideRouter([]),
        { provide: AdminAuthService, useValue: { role: () => role, logout } },
      ],
    });
  });
  it('links to the primary overview and all management pages without a version switch', () => {
    const fixture = TestBed.createComponent(AdminNav);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('nav a')] as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/dashboard',
      '/admin/guests',
      '/admin/events',
      '/admin/gallery',
    ]);
    expect(links[0].textContent).toBe('Overview');
    expect(fixture.nativeElement.textContent).not.toContain('v2');
  });
  it('hides management destinations from restricted administrators', () => {
    role = 'restricted';
    const fixture = TestBed.createComponent(AdminNav);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('nav a')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('nav a').getAttribute('href')).toBe(
      '/admin/dashboard',
    );
  });
  it('preserves sign-out failure feedback and retries successfully', async () => {
    const fixture = TestBed.createComponent(AdminNav);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    logout.mockRejectedValueOnce(new Error('offline'));
    await fixture.componentInstance.logout();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Unable to sign out',
    );
    expect(navigate).not.toHaveBeenCalled();
    await fixture.componentInstance.logout();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/admin/login']);
    expect(fixture.componentInstance.error()).toBe('');
  });
});
