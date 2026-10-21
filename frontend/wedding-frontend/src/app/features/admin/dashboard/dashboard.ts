import { AdminReadState, adminRead } from '../../../core/utils/admin-read-state';
import { AdminReadStatus } from '../read-status/read-status';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { DashboardData } from '../../../core/models/admin';
import { attendanceRows, attendanceSummary, buildCsv } from '../../../core/utils/admin';
import { matchesTag } from '../../../core/utils/tags';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AdminNav } from '../admin-nav/admin-nav';
@Component({
  selector: 'app-admin-dashboard',
  imports: [FormsModule, AdminNav, AdminReadStatus],
  templateUrl: './dashboard.html',
  styleUrl: '../admin.scss',
})
export class Dashboard {
  private api = inject(AdminService);
  readonly auth = inject(AdminAuthService);
  data = signal<DashboardData>({ guests: [], events: [], responses: [] });
  readonly read = new AdminReadState();
  loading = this.read.loading;
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
        const totals = attendanceSummary(rows);
        return {id: event.id, name: event.name, invited: totals.invited, peopleInvited: totals.peopleInvited};
      }),
  );
  tagSummary = computed(() => {
    if (this.auth.role() !== 'full') return [];
    const guests = [...new Map(this.taggedData().guests
      .filter(guest => guest.name.toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase())
        && (!this.eventId() || guest.event_ids.includes(this.eventId())))
      .map(guest => [guest.id, guest])).values()];
    const tags = this.data().tags ?? [...new Map(this.data().guests.flatMap(guest => guest.tags || []).map(tag => [tag.id, tag])).values()];
    return [...tags, {id:'untagged',name:'Untagged'}]
      .filter(tag => !this.tagId() || tag.id === this.tagId())
      .map(tag => {
        const parties = guests.filter(guest => matchesTag(guest.tags, tag.id));
        return {...tag, invited:parties.length, peopleInvited:parties.reduce((sum, guest) => sum + guest.party_size, 0)};
      });
  });
  constructor() {
    void this.load();
  }
  async load() {
    return this.read.run(() => adminRead(this.api.dashboard()), value => this.data.set(value), 'Unable to load RSVP results. Please retry.');
  }
  clearFilters() { this.search.set(''); this.eventId.set(''); this.tagId.set(''); }
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
