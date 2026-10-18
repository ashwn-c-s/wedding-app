import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuestTag } from '../../../core/models/admin';
import { normalizeTagName, tagNameError } from '../../../core/utils/tags';
@Component({
  selector: 'app-tag-picker',
  imports: [FormsModule],
  templateUrl: './tag-picker.html',
  styleUrl: './tag-picker.scss',
})
export class TagPicker {
  readonly catalogue = input<GuestTag[]>([]);
  readonly ids = input<string[]>([]);
  readonly names = input<string[]>([]);
  readonly selection = output<{ tag_ids: string[]; new_tags: string[] }>();
  query = signal('');
  error = signal('');
  selected = computed(() => [
    ...this.ids().map(
      (id) => this.catalogue().find((tag) => tag.id === id) || { id, name: 'Unavailable tag' },
    ),
    ...this.names().map((name) => ({ id: 'draft:' + name, name })),
  ]);
  suggestions = computed(() =>
    this.catalogue().filter(
      (tag) =>
        !this.ids().includes(tag.id) &&
        tag.name.toLowerCase().includes(this.query().trim().toLowerCase()),
    ),
  );
  choose(tag: GuestTag) {
    if (this.ids().includes(tag.id)) return;
    if (this.selected().length >= 10) {
      this.error.set('Choose up to 10 tags per guest.');
      return;
    }
    this.selection.emit({ tag_ids: [...this.ids(), tag.id], new_tags: [...this.names()] });
    this.query.set('');
    this.error.set('');
  }
  remove(id: string) {
    this.selection.emit({
      tag_ids: this.ids().filter((existing) => existing !== id),
      new_tags: this.names().filter((name) => 'draft:' + name !== id),
    });
    this.error.set('');
  }
  create() {
    const name = normalizeTagName(this.query());
    const error = tagNameError(name);
    if (error) {
      this.error.set(error);
      return;
    }
    const existing = this.catalogue().find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      this.choose(existing);
      return;
    }
    if (this.names().some((tag) => tag.toLowerCase() === name.toLowerCase())) {
      this.query.set('');
      return;
    }
    if (this.selected().length >= 10) {
      this.error.set('Choose up to 10 tags per guest.');
      return;
    }
    this.selection.emit({ tag_ids: [...this.ids()], new_tags: [...this.names(), name] });
    this.query.set('');
    this.error.set('');
  }
}
