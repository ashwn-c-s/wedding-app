import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GuestInvite, RsvpStatus, RsvpResponse, Photo, Event } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  getInvite(token: string) {
    return this.http.get<GuestInvite>(`${this.baseUrl}/api/invite/${token}`).pipe(map(parseInvite));
  }

  getDefaultEvents() {
    return this.http.get<{ venues: Event[] }>(`${this.baseUrl}/api/invite/defaultevents`).pipe(map(parseVenues));
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
    return this.http.get<{ venues: Event[] }>(`${this.baseUrl}/api/invite/${token}/venues`).pipe(map(parseVenues));
  }

  getGallery() {
    return this.http.get<{ photos: Photo[] }>(`${this.baseUrl}/api/gallery`);
  }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unexpected invitation response');
  return value as Record<string, unknown>;
}

function parseEvents(value: unknown): Event[] {
  if (!Array.isArray(value)) throw new Error('Missing event list');
  return value.map(item => {
    const event = record(item);
    if (typeof event['id'] !== 'string' || typeof event['name'] !== 'string' || typeof event['date'] !== 'string' || Number.isNaN(Date.parse(event['date']))) throw new Error('Invalid event details');
    const optional = (key: string) => typeof event[key] === 'string' ? event[key] as string : null;
    return { id: event['id'], name: event['name'], date: event['date'], slug: optional('slug') || '', time_label: optional('time_label') || '', venue_name: optional('venue_name'), venue_address: optional('venue_address'), maps_url: optional('maps_url'), directions_text: optional('directions_text'), ...(typeof event['is_visible'] === 'boolean' ? {is_visible: event['is_visible']} : {}) };
  });
}

function parseInvite(value: unknown): GuestInvite {
  const result = record(value);
  const guest = record(result['guest']);
  if (typeof guest['id'] !== 'string' || typeof guest['name'] !== 'string' || typeof guest['party_size'] !== 'number' || !Number.isInteger(guest['party_size']) || guest['party_size'] < 1) throw new Error('Invalid guest details');
  return {guest: {id: guest['id'], name: guest['name'], party_size: guest['party_size']}, events: parseEvents(result['events'])};
}

function parseVenues(value: unknown): {venues: Event[]} {
  return {venues: parseEvents(record(value)['venues'])};
}
