import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { DashboardData } from '../../../core/models/admin';
import { AdminReadState, adminRead } from '../../../core/utils/admin-read-state';
import { buildCsv } from '../../../core/utils/admin';
import {
  invitationOverview,
  invitationPlanningRows,
} from '../../../core/utils/invitation-overview';

@Component({
  selector: 'app-dashboard-v2',
  imports: [FormsModule, RouterLink, DecimalPipe, DatePipe],
  templateUrl: './dashboard-v2.html',
  styleUrl: './dashboard-v2.scss',
})
export class DashboardV2 {
  private readonly api = inject(AdminService);
  private readonly router = inject(Router);
  readonly auth = inject(AdminAuthService);
  readonly data = signal<DashboardData>({ guests: [], events: [], responses: [] });
  readonly read = new AdminReadState();
  readonly loading = this.read.loading;
  readonly search = signal('');
  readonly eventId = signal('');
  readonly tagIds = signal<string[]>([]);
  readonly lastRefreshed = signal<Date | null>(null);
  readonly logoutBusy = signal(false);
  readonly logoutError = signal('');
  private readonly filters = computed(() => ({
    search: this.search(),
    eventId: this.eventId(),
    tagIds: this.tagIds(),
    allowTags: this.auth.role() === 'full',
  }));
  readonly overview = computed(() => invitationOverview(this.data(), this.filters()));
  readonly activeFilterCount = computed(
    () =>
      Number(!!this.search().trim()) +
      Number(!!this.eventId()) +
      (this.auth.role() === 'full' ? this.tagIds().length : 0),
  );
  readonly selectedTagsLabel = computed(() =>
    this.auth.role() === 'full' && this.tagIds().length
      ? this.tagIds()
          .map((id) =>
            id === 'untagged'
              ? 'Untagged'
              : this.overview().tags.find((tag) => tag.id === id)?.name || 'Selected tag',
          )
          .join(', ')
      : 'All tags',
  );

  constructor() {
    void this.load();
  }

  async load() {
    if (this.read.loading() && this.read.loaded()) return false;
    return this.read.run(
      () => adminRead(this.api.dashboard()),
      (value) => {
        this.data.set(value);
        this.lastRefreshed.set(new Date());
      },
      'Unable to load invitation totals. Please retry.',
    );
  }

  toggleTag(id: string, selected: boolean) {
    this.tagIds.update((ids) =>
      selected ? [...new Set([...ids, id])] : ids.filter((value) => value !== id),
    );
  }

  clearFilters() {
    this.search.set('');
    this.eventId.set('');
    this.tagIds.set([]);
  }

  eventNames(guest: DashboardData['guests'][number]): string {
    const names = this.data()
      .events.filter((event) => guest.event_ids.includes(event.id))
      .map((event) => event.name);
    return (
      names.join(', ') ||
      (guest.event_ids.length ? 'Assigned event unavailable' : 'No events assigned')
    );
  }

  tagWidth(people: number, eventPeople: number): number {
    return eventPeople > 0 ? Math.min(100, (people / eventPeople) * 100) : 0;
  }

  exportRows() {
    return invitationPlanningRows(this.data(), this.filters());
  }

  exportCsv() {
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', buildCsv(this.exportRows())], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wedding-invitations-filtered.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async logout() {
    if (this.logoutBusy()) return;
    this.logoutBusy.set(true);
    this.logoutError.set('');
    try {
      await this.auth.logout();
      await this.router.navigate(['/admin/login']);
    } catch {
      this.logoutError.set('Unable to sign out. Please try again.');
    } finally {
      this.logoutBusy.set(false);
    }
  }
}
