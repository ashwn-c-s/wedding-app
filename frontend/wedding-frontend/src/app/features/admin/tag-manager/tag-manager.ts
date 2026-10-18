import { Component, ElementRef, ViewChild, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { GuestTag } from '../../../core/models/admin';
import { normalizeTagName, tagNameError } from '../../../core/utils/tags';
@Component({
  selector: 'app-tag-manager',
  imports: [FormsModule],
  templateUrl: './tag-manager.html',
  styleUrl: './tag-manager.scss',
})
export class TagManager {
  private api = inject(AdminService);
  readonly catalogue = input<GuestTag[]>([]);
  readonly renamed = output<GuestTag>();
  @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  selected = '';
  name = '';
  busy = signal(false);
  error = signal('');
  open() {
    this.selected = this.catalogue()[0]?.id || '';
    this.select(this.selected);
    this.error.set('');
    this.dialog.nativeElement.showModal();
  }
  close() {
    if (!this.busy()) this.dialog.nativeElement.close();
  }
  select(id: string) {
    this.selected = id;
    this.name = this.catalogue().find((tag) => tag.id === id)?.name || '';
    this.error.set('');
  }
  count() {
    return this.catalogue().find((tag) => tag.id === this.selected)?.guest_count || 0;
  }
  async save() {
    if (!this.selected || this.busy()) return;
    const name = normalizeTagName(this.name);
    const error = tagNameError(name);
    if (error) {
      this.error.set(error);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const { tag } = await firstValueFrom(this.api.renameTag(this.selected, name));
      this.renamed.emit(tag);
      this.dialog.nativeElement.close();
    } catch (error: any) {
      this.error.set(
        typeof error?.error?.error === 'string'
          ? error.error.error
          : 'Unable to rename tag. Please try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
