import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { Dashboard } from './dashboard/dashboard';
import { Guests } from './guests/guests';
import { Events } from './events/events';
import { AdminGallery } from './gallery/gallery';
import { AdminService } from '../../core/services/admin.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { GalleryService } from '../../core/services/gallery.service';

const guest={id:'guest',name:'Original guest',phone:'123',party_size:2,invite_token:'token',event_ids:['event'],responses:[]};
const dashboard={guests:[guest],events:[{id:'event',name:'Wedding'}],responses:[]};
describe('Admin load, refresh and mutation recovery',()=>{
  let api:any;
  beforeEach(()=>{
    api={guests:vi.fn(()=>of({guests:[guest]})),events:vi.fn(()=>of({events:[]})),dashboard:vi.fn(()=>of(dashboard)),list:vi.fn(()=>of({photos:[]})),saveGuest:vi.fn()};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AdminService,useValue:api},{provide:GalleryService,useValue:api},{provide:AdminAuthService,useValue:{role:()=> 'full'}}]});
  });
  for(const [name,component,key,empty] of [
    ['Guests',Guests,'guests','No guests'], ['Events',Events,'events','No events available'],
    ['RSVP',Dashboard,'dashboard','No invitations'], ['Photos',AdminGallery,'list','first photograph'],
  ] as const){
    it(`${name}: failed first load offers Retry without presenting false empty results`,async()=>{
      api[key].mockImplementation(()=>throwError(()=>new Error('offline')));
      const fixture=TestBed.createComponent(component as any);const instance:any=fixture.componentInstance;
      await instance.load();fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to load');
      expect(fixture.nativeElement.textContent).not.toContain(empty);
      expect(fixture.nativeElement.querySelector('.metric')).toBeNull();
      const retry:HTMLButtonElement=fixture.nativeElement.querySelector('app-admin-read-status button');
      expect(retry.textContent?.trim()).toBe('Retry');expect(retry.disabled).toBe(false);
      const value=key==='guests'?{guests:[]}:key==='events'?{events:[]}:key==='list'?{photos:[]}:{guests:[],events:[],responses:[]};
      api[key].mockImplementation(()=>of(value));retry.click();await fixture.whenStable();fixture.detectChanges();
      expect(instance.read.loaded()).toBe(true);expect(instance.read.error()).toBe('');
      expect(fixture.nativeElement.textContent).toContain(empty);
    });
  }
  it('keeps guest results, filters, view controls and the focused refresh control while refreshing',async()=>{
    const fixture=TestBed.createComponent(Guests);const component=fixture.componentInstance;
    await component.load();fixture.detectChanges();await fixture.whenStable();
    component.viewMode.set('list');component.search.set('Original');fixture.detectChanges();
    const refresh:HTMLButtonElement=fixture.nativeElement.querySelector('app-admin-read-status button');
    refresh.focus();const waiting=new Subject<any>();api.guests.mockReturnValue(waiting);
    const loads=vi.spyOn(component,'load');refresh.click();fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.guest-table').textContent).toContain('Original guest');
    expect(fixture.nativeElement.querySelector('.view-toggle')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-admin-read-status button')).toBe(refresh);
    expect(refresh.disabled).toBe(true);expect(fixture.nativeElement.querySelector('.guest-list').getAttribute('aria-busy')).toBe('true');
    waiting.error(new Error('offline'));await loads.mock.results[0].value;await fixture.whenStable();fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Showing previously loaded data');
    expect(fixture.nativeElement.querySelector('.guest-table').textContent).toContain('Original guest');
    expect(component.search()).toBe('Original');expect(component.viewMode()).toBe('list');
  });
  it('ignores a pre-save refresh response and blocks starting a conflicting refresh during a save',async()=>{
    const component=TestBed.runInInjectionContext(()=>new Guests());await component.load();component.edit(guest);component.draft!.name='Updated guest';
    const refreshing=new Subject<any>();api.guests.mockReturnValue(refreshing);const refresh=component.load();
    const saving=new Subject<any>();api.saveGuest.mockReturnValue(saving);const save=component.save();
    const reads=api.guests.mock.calls.length;await component.load();expect(api.guests).toHaveBeenCalledTimes(reads);
    saving.next({guest:{...guest,name:'Updated guest'}});saving.complete();await save;
    refreshing.next({guests:[guest]});refreshing.complete();await refresh;
    expect(component.guests()[0].name).toBe('Updated guest');expect(component.notice()).toContain('Guest updated');
  });
  it('reports an uncertain write immediately, keeps the draft and requires successful reconciliation before another write',async()=>{
    const component=TestBed.runInInjectionContext(()=>new Guests());await component.load();component.edit(guest);
    const reads=api.guests.mock.calls.length;
    api.saveGuest.mockReturnValue(throwError(()=>new HttpErrorResponse({status:0})));
    await component.save();expect(component.saving()).toBe(false);expect(component.draft?.name).toBe(guest.name);
    expect(api.guests).toHaveBeenCalledTimes(reads);expect(component.needsReconcile()).toBe(true);
    await component.save();expect(api.saveGuest).toHaveBeenCalledTimes(1);
    api.guests.mockReturnValue(throwError(()=>new Error('offline')));await component.load();expect(component.needsReconcile()).toBe(true);
    api.guests.mockReturnValue(of({guests:[guest]}));await component.load();expect(component.needsReconcile()).toBe(false);
  });
  it('shows an initial skeleton near the heading before the CSV import form',async()=>{
    const waiting=new Subject<any>();api.guests.mockReturnValue(waiting);
    const fixture=TestBed.createComponent(Guests);fixture.detectChanges();
    const root:HTMLElement=fixture.nativeElement;
    expect(root.querySelector('.skeletons')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.guest-table')).toBeNull();
    expect(root.querySelectorAll('app-admin-read-status')).toHaveLength(1);
    expect(root.querySelector('app-admin-read-status')?.compareDocumentPosition(root.querySelector('.panel')!)! & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    waiting.next({guests:[]});waiting.complete();
    await vi.waitFor(()=>expect(fixture.componentInstance.read.loaded()).toBe(true));
  });
  it('blocks refresh during CSV writes and refreshes after the import report is received',async()=>{
    const component=TestBed.runInInjectionContext(()=>new Guests());await component.load();
    const importing=new Subject<any>();api.importGuests=vi.fn(()=>importing);component.csv='name,phone,party_size,events\nA,123,2,wedding';
    const operation=component.importCsv();const reads=api.guests.mock.calls.length;
    await component.load();expect(api.guests).toHaveBeenCalledTimes(reads);
    importing.next({created:1,updated:0,failed:0,results:[]});importing.complete();await operation;
    expect(component.report()?.created).toBe(1);expect(component.importing()).toBe(false);expect(api.guests).toHaveBeenCalledTimes(reads+1);
  });
  it('keeps a saved event newer than any refresh that began before the write',async()=>{
    const event={id:'event',slug:'wedding',name:'Wedding',date:'2026-11-15T05:00:00Z',time_label:'Morning',venue_name:null,venue_address:null,maps_url:null,directions_text:null,is_visible:true};
    api.events.mockReturnValue(of({events:[event]}));api.saveEvent=vi.fn(()=>of({event:{...event,name:'Updated wedding'}}));
    const component=TestBed.runInInjectionContext(()=>new Events());await component.load();component.select(event.id);component.draft!.name='Updated wedding';
    const waiting=new Subject<any>();api.events.mockReturnValue(waiting);const read=component.load();
    await component.save();waiting.next({events:[event]});waiting.complete();await read;
    expect(component.events()[0].name).toBe('Updated wedding');expect(component.notice()).toBe('Event saved.');
  });
  it('keeps dashboard metrics and rows visible while reading a refresh',async()=>{
    const fixture=TestBed.createComponent(Dashboard);await fixture.componentInstance.load();fixture.detectChanges();
    const waiting=new Subject<any>();api.dashboard.mockReturnValue(waiting);const refreshing=fixture.componentInstance.load();fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.metric')).not.toBeNull();expect(fixture.nativeElement.textContent).toContain('Original guest');
    waiting.next(dashboard);waiting.complete();await refreshing;
  });
});
