import { TestBed } from '@angular/core/testing';
import { TagPicker } from './tag-picker';

describe('Guest tag picker', () => {
  it('reuses existing labels case-insensitively and keeps new labels as draft selections', async () => {
    const fixture = TestBed.createComponent(TagPicker);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('catalogue', [{ id: 'office', name: 'Office friends' }]);
    const selected = vi.fn();
    component.selection.subscribe(selected);
    component.query.set(' office   friends ');
    component.create();
    expect(selected).toHaveBeenLastCalledWith({ tag_ids: ['office'], new_tags: [] });
    fixture.componentRef.setInput('ids', ['office']);
    component.query.set("Father's relatives");
    component.create();
    expect(selected).toHaveBeenLastCalledWith({
      tag_ids: ['office'],
      new_tags: ["Father's relatives"],
    });
    fixture.componentRef.setInput('names', ["Father's relatives"]);
    component.remove('office');
    expect(selected).toHaveBeenLastCalledWith({ tag_ids: [], new_tags: ["Father's relatives"] });
  });
  it('rejects invalid names and prevents more than ten selected labels', () => {
    const fixture = TestBed.createComponent(TagPicker);
    const component = fixture.componentInstance;
    const selected = vi.fn();
    component.selection.subscribe(selected);
    component.query.set('bad|tag');
    component.create();
    expect(selected).not.toHaveBeenCalled();
    expect(component.error()).toContain('without |');
    fixture.componentRef.setInput(
      'names',
      Array.from({ length: 10 }, (_, i) => 'Tag ' + i),
    );
    component.query.set('Extra');
    component.create();
    expect(selected).not.toHaveBeenCalled();
    expect(component.error()).toContain('10');
  });
});
