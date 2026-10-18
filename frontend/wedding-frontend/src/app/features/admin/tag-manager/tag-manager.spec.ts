import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TagManager } from './tag-manager';
import { AdminService } from '../../../core/services/admin.service';
describe('Shared tag rename', () => {
  it('shows the affected party count and keeps a failed rename open for correction', async () => {
    const api = {
      renameTag: vi.fn(() =>
        throwError(() => ({ error: { error: 'A tag with that name already exists.' } })),
      ),
    };
    TestBed.configureTestingModule({
      imports: [TagManager],
      providers: [{ provide: AdminService, useValue: api }],
    });
    const fixture = TestBed.createComponent(TagManager);
    fixture.componentRef.setInput('catalogue', [{ id: 'office', name: 'Office', guest_count: 3 }]);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.dialog.nativeElement.showModal = vi.fn();
    component.dialog.nativeElement.close = vi.fn();
    component.open();
    expect(component.count()).toBe(3);
    component.name = '  School   friends ';
    await component.save();
    expect(api.renameTag).toHaveBeenCalledWith('office', 'School friends');
    expect(component.error()).toContain('already exists');
    expect(component.dialog.nativeElement.close).not.toHaveBeenCalled();
    api.renameTag.mockReturnValue(of({ tag: { id: 'office', name: 'Colleagues' } }) as any);
    const renamed = vi.fn();
    component.renamed.subscribe(renamed);
    component.name = 'Colleagues';
    await component.save();
    expect(renamed).toHaveBeenCalledWith({ id: 'office', name: 'Colleagues' });
    expect(component.dialog.nativeElement.close).toHaveBeenCalledOnce();
  });
});
