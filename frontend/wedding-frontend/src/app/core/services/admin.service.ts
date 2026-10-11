import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminGuest, DashboardData, EventUpdate, ImportReport } from '../models/admin';
import { Event } from '../models/index';
@Injectable({providedIn: 'root'})
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/admin`;
  guests() { return this.http.get<{guests: AdminGuest[]}>(`${this.base}/guests`); }
  importGuests(csv: string) { return this.http.post<ImportReport>(`${this.base}/guests/import`, {csv}); }
  dashboard() { return this.http.get<DashboardData>(`${this.base}/rsvps`); }
  events() { return this.http.get<{events: Event[]}>(`${this.base}/events`); }
  saveEvent(id: string, event: EventUpdate) { return this.http.patch<{event: Event}>(`${this.base}/events/${encodeURIComponent(id)}`, event); }
}
