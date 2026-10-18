import { Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, provideRouter, Router } from '@angular/router';
import { AdminAccessState } from '../../../core/services/admin-access-state';
import { AdminAccessStatus } from './admin-access-status';
describe('Admin access feedback',()=>{
  it('announces checking, shows an outage and retries the protected target',async()=>{
    TestBed.configureTestingModule({providers:[provideRouter([])]});
    const access=TestBed.inject(AdminAccessState);const fixture=TestBed.createComponent(AdminAccessStatus);
    access.checking.set(true);fixture.detectChanges();expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Checking admin access');
    access.checking.set(false);access.error.set('Connection unavailable');access.target.set('/admin/guests');fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Connection unavailable');
    const navigate=vi.spyOn(TestBed.inject(Router),'navigateByUrl').mockResolvedValue(true);fixture.nativeElement.querySelector('button').click();
    expect(navigate).toHaveBeenCalledWith('/admin/guests',{onSameUrlNavigation:'reload'});
  });
  it('keeps admin access feedback off public pages after navigating away',()=>{
    const events=new Subject<NavigationStart>();
    TestBed.configureTestingModule({providers:[{provide:Router,useValue:{events,navigateByUrl:vi.fn()}}]});
    const access=TestBed.inject(AdminAccessState);access.error.set('Connection unavailable');
    const fixture=TestBed.createComponent(AdminAccessStatus);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    events.next(new NavigationStart(1,'/about'));fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    access.checking.set(true);events.next(new NavigationStart(2,'/admin/guests'));fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

});
