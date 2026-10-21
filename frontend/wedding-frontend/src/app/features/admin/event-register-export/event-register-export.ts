import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { DashboardData } from '../../../core/models/admin';
import { EntryRegisterPdf } from '../../../core/services/entry-register-pdf.service';
import { buildEntryRegister } from '../../../core/utils/event-entry-register';

@Component({
  selector: 'app-event-register-export',
  imports: [FormsModule],
  templateUrl: './event-register-export.html',
  styleUrl: './event-register-export.scss',
})
export class EventRegisterExport {
  private readonly pdf = inject(EntryRegisterPdf);
  data = input.required<DashboardData>();
  allowTags = input(false);
  search = input('');
  tagIds = input<string[]>([]);
  eventId = input('');
  disabled = input(false);
  dataAsOf = input<Date | null>(null);
  chosenEventId = signal('');
  scope = signal<'all' | 'filtered'>('all');
  includeUnassigned = signal(true);
  busy = signal(false);
  error = signal('');
  success = signal('');
  selectedEventId = computed(() => {
    const requested = this.chosenEventId() || this.eventId();
    return this.data().events.some((event) => event.id === requested)
      ? requested
      : this.data().events[0]?.id || '';
  });
  hasSubsetFilters = computed(
    () => !!this.search().trim() || (this.allowTags() && this.tagIds().length > 0),
  );

  async exportPdf() {
    if (this.busy() || this.disabled() || !this.selectedEventId()) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const filtered = this.scope() === 'filtered';
      const { definition, filename } = buildEntryRegister(this.data(), {
        eventId: this.selectedEventId(),
        allowTags: this.allowTags(),
        search: filtered ? this.search() : '',
        tagIds: filtered ? this.tagIds() : [],
        includeUnassigned: this.includeUnassigned(),
        dataAsOf: this.dataAsOf(),
      });
      await this.pdf.download(definition, filename);
      this.success.set('PDF generated. Check your browser downloads or PDF preview.');
    } catch {
      this.error.set('Unable to generate the entry register. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
