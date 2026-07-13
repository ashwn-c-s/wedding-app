import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GuestInvite, RsvpStatus, RsvpResponse, Photo } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  getInvite(token: string) {
    return this.http.get<GuestInvite>(`${this.baseUrl}/api/invite/${token}`);
  }

  getRsvpStatus(token: string) {
    return this.http.get<RsvpStatus>(`${this.baseUrl}/api/invite/${token}/rsvp-status`);
  }

  submitRsvp(token: string, responses: RsvpResponse[]) {
    return this.http.post<{ success: boolean }>(
      `${this.baseUrl}/api/invite/${token}/rsvp`,
      { responses }
    );
  }

  getVenues(token: string) {
    return this.http.get<{ venues: any[] }>(`${this.baseUrl}/api/invite/${token}/venues`);
  }

  getGallery() {
    return this.http.get<{ photos: Photo[] }>(`${this.baseUrl}/api/gallery`);
  }
}