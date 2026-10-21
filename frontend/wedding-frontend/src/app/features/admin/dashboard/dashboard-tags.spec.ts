import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { AdminService } from '../../../core/services/admin.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
const office = { id: 'office', name: 'Office friends' },
  school = { id: 'school', name: 'School friends' };
const data = {
  guests: [
    { id: 'a', name: 'Anita', party_size: 3, event_ids: ['event'], tags: [office, school] },
    { id: 'b', name: 'Other', party_size: 2, event_ids: ['event'], tags: [] },
  ],
  events: [{ id: 'event', name: 'Wedding' }],
  responses: [{ guest_id: 'a', event_id: 'event', attending: true, submitted_at: '' }],
  tags: [office, school],
};
describe('Tag-aware attendance and export', () => {
  it('combines tag and event filters without duplicating a multi-tag guest', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: { dashboard: () => of(data) } },
        { provide: AdminAuthService, useValue: { role: () => 'full' } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new Dashboard());
    await Promise.resolve();
    component.tagId.set('office');
    component.eventId.set('event');
    expect(component.rows()).toHaveLength(1);
    expect(component.summary().peopleInvited).toBe(3);
    expect(component.eventSummary()[0].peopleInvited).toBe(3);
    expect(component.exportRows()[1].at(-1)).toBe('Office friends|School friends');
    component.tagId.set('untagged');
    expect(component.summary().pending).toBe(1);
    expect(component.rows()[0].guestId).toBe('b');
  });
  it('restricted admins cannot use private tag filters or export tag labels', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: { dashboard: () => of(data) } },
        { provide: AdminAuthService, useValue: { role: () => 'restricted' } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new Dashboard());
    await Promise.resolve();
    component.tagId.set('office');
    expect(component.rows()).toHaveLength(2);
    expect(component.exportRows()[0]).not.toContain('Tags');
  });
});
