import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { DashboardData } from '../../../core/models/admin';
import { attendanceRows, attendanceSummary, buildCsv } from '../../../core/utils/admin';
import { matchesTag } from '../../../core/utils/tags';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AdminNav } from '../admin-nav/admin-nav';
@Component({
  selector: 'app-admin-dashboard',
  imports: [FormsModule, AdminNav],
  templateUrl: './dashboard.html',
  styleUrl: '../admin.scss',
})
export class Dashboard {
  private api = inject(AdminService);
  readonly auth = inject(AdminAuthService);
  data = signal<DashboardData>({ guests: [], events: [], responses: [] });
  loading = signal(true);
  error = signal('');
  search = signal('');
  eventId = signal('');
  tagId = signal('');
  taggedData = computed(() => ({...this.data(),guests:this.data().guests.filter(guest=>matchesTag(guest.tags,this.auth.role()==='full'?this.tagId():''))}));
  rows = computed(() => attendanceRows(this.taggedData(), this.search(), this.eventId()));
  summary = computed(() =>
    attendanceSummary(
      this.rows(),
      this.eventId()
        ? undefined
        : this.taggedData().guests.filter((guest) =>
            guest.name.toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase()),
          ),
    ),
  );
  eventSummary = computed(() =>
    this.data()
      .events.filter((event) => !this.eventId() || event.id === this.eventId())
      .map((event) => {
        const rows = this.rows().filter((row) => row.eventId === event.id);
        return {
          name: event.name,
          ...attendanceSummary(rows),
          attendees: rows
            .filter((row) => row.response === 'Confirmed')
            .reduce((sum, row) => sum + row.partySize, 0),
        };
      }),
  );
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await firstValueFrom(this.api.dashboard()));
    } catch {
      this.error.set('Unable to load RSVP results. Check your session and try again.');
    } finally {
      this.loading.set(false);
    }
  }
  exportRows() {
    return [
      ['Guest', 'Party size', 'Event', 'Response', 'Submitted at',...(this.auth.role()==='full'?['Tags']:[])],
      ...this.rows().map((row) => [
        row.name,
        row.partySize,
        row.event,
        row.response,
        row.submittedAt,
        ...(this.auth.role()==='full'?[this.data().guests.find(guest=>guest.id===row.guestId)?.tags?.map(tag=>tag.name).join('|') || '']:[]),
      ]),
    ];
  }
  exportCsv() {
    const csv=buildCsv(this.exportRows());
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wedding-rsvps-filtered.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
