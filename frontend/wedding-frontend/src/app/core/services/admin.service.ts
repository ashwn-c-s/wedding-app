import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminGuest, DashboardData, EventUpdate, EventCreate, GuestUpdate, ImportReport } from '../models/admin';
import { Event } from '../models/index';
@Injectable({providedIn: 'root'})
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/admin`;
  guests() { return this.http.get<{guests: AdminGuest[]}>(`${this.base}/guests`); }
  createGuest(guest: GuestUpdate) { return this.http.post<{guest:AdminGuest}>(`${this.base}/guests`,guest); }
  saveGuest(id:string, guest: GuestUpdate) { return this.http.patch<{guest:AdminGuest}>(`${this.base}/guests/${encodeURIComponent(id)}`,guest); }
  importGuests(csv: string) { return this.http.post<ImportReport>(`${this.base}/guests/import`, {csv}); }
  dashboard() { return this.http.get<DashboardData>(`${this.base}/rsvps`); }
  events() { return this.http.get<{events: Event[]}>(`${this.base}/events`); }
  createEvent(event: EventCreate) { return this.http.post<{event:Event}>(`${this.base}/events`,event); }
  saveEvent(id: string, event: EventUpdate) { return this.http.patch<{event: Event}>(`${this.base}/events/${encodeURIComponent(id)}`, event); }
}
