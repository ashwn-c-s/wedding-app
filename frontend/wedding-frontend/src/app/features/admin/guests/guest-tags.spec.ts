import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Guests } from './guests';
import { AdminService } from '../../../core/services/admin.service';
const office = { id: 'office', name: 'Office friends' },
  school = { id: 'school', name: 'School friends' };
const guest = {
  id: 'g',
  name: 'Anita',
  phone: '123',
  party_size: 2,
  event_ids: ['event'],
  invite_token: 'same',
  responses: [],
  tags: [office, school],
};
describe('Guest tag workflow', () => {
  let api: any;
  beforeEach(() => {
    api = {
      guests: vi.fn(() =>
        of({
          guests: [guest, { ...guest, id: 'other', name: 'Other', tags: [] }],
          tags: [office, school],
        }),
      ),
      events: vi.fn(() => of({ events: [] })),
      saveGuest: vi.fn(),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AdminService, useValue: api }] });
  });
  it('combines search and tag filters and counts parties once per tag', async () => {
    const component = TestBed.runInInjectionContext(() => new Guests());
    await component.load();
    component.tagFilter.set('office');
    expect(component.filtered().map((g) => g.id)).toEqual(['g']);
    component.search.set('Other');
    expect(component.filtered()).toEqual([]);
    component.search.set('');
    component.tagFilter.set('untagged');
    expect(component.filtered().map((g) => g.id)).toEqual(['other']);
    expect(component.catalogue()[0].guest_count).toBe(1);
  });
  it('saves explicit tag removals while preserving events after an RSVP', async () => {
    const component = TestBed.runInInjectionContext(() => new Guests());
    await component.load();
    component.edit({ ...guest, responses: [{ event_id: 'event', attending: true }] });
    component.setTags({ tag_ids: [], new_tags: [] });
    component.toggleEvent('other', true);
    api.saveGuest.mockReturnValue(of({ guest: { ...guest, tags: [] } }));
    await component.save();
    expect(api.saveGuest).toHaveBeenCalledWith(
      'g',
      expect.objectContaining({ event_ids: ['event'], tag_ids: [], new_tags: [] }),
    );
    expect(component.guests().find((g) => g.id === 'g')?.tags).toEqual([]);
  });
  it('retains draft details and tags after a failed transaction for a safe retry', async () => {
    const component = TestBed.runInInjectionContext(() => new Guests());
    await component.load();
    component.edit(guest);
    component.setTags({ tag_ids: ['office'], new_tags: ['New label'] });
    api.saveGuest.mockReturnValue(throwError(() => new Error('offline')));
    await component.save();
    expect(component.draft?.new_tags).toEqual(['New label']);
    expect(component.draft?.name).toBe('Anita');
    expect(component.saving()).toBe(false);
  });
  it('renaming a shared tag updates all displayed guests while keeping stable tag IDs', async () => {
    const component = TestBed.runInInjectionContext(() => new Guests());
    await component.load();
    component.renameTag({ ...office, name: 'Colleagues' });
    expect(component.guests()[0].tags?.[0]).toEqual({ id: 'office', name: 'Colleagues' });
    expect(component.tags()[0].id).toBe('office');
  });
});
