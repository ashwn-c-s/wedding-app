import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Event } from '../../../core/models/index';
import { EventUpdate } from '../../../core/models/admin';
import { AdminService } from '../../../core/services/admin.service';
import { AdminNav } from '../admin-nav/admin-nav';
function validCalendarDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
}
export function validEventDate(date: string): boolean {
  if (!validCalendarDate(date.slice(0,10))) return false;
  if (date.length === 10) return true;
  return /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(date) && Number.isFinite(Date.parse(date));
}
export function kolkataDateInput(date: string): string {
  if (!validEventDate(date)) return '';
  if (date.length === 10) return `${date}T00:00:00`;
  return new Date(Date.parse(date) + 330 * 60 * 1000).toISOString().slice(0,19);
}
export function kolkataTimestamp(input: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input) || !validCalendarDate(input.slice(0,10))) return '';
  return `${input.length === 16 ? input + ':00' : input}+05:30`;
}
export function validateEvent(event: EventUpdate): string {
  if (!event.name.trim()) return 'Enter an event name.';
  if (!validEventDate(event.date)) return 'Enter a valid event date and time.';
  if (event.maps_url) { try { if (new URL(event.maps_url).protocol !== 'https:') return 'Maps link must use https.'; } catch { return 'Enter a valid maps link.'; } }
  return '';
}
@Component({selector:'app-admin-events',imports:[FormsModule,AdminNav],templateUrl:'./events.html',styleUrl:'../admin.scss'})
export class Events {
  private api = inject(AdminService); events = signal<Event[]>([]); loading = signal(true); saving = signal(false); selectedId = ''; dateInput = ''; private originalDateInput = ''; draft: EventUpdate | null = null; error = signal(''); notice = signal('');
  constructor(){void this.load();}
  async load(){this.loading.set(true);this.error.set('');try{this.events.set((await firstValueFrom(this.api.events())).events);}catch{this.error.set('Unable to load events. Check your session and try again.');}finally{this.loading.set(false);}}
  select(id: string){this.selectedId=id;this.error.set('');this.notice.set(''); const event=this.events().find(event=>event.id===id); this.draft=event ? {name:event.name,date:event.date,time_label:event.time_label,venue_name:event.venue_name,venue_address:event.venue_address,maps_url:event.maps_url,directions_text:event.directions_text,is_visible:event.is_visible} : null; this.dateInput=event ? kolkataDateInput(event.date) : ''; this.originalDateInput=this.dateInput;}
  async save(){if(this.saving() || !this.draft)return; const date=this.dateInput === this.originalDateInput ? this.draft.date : kolkataTimestamp(this.dateInput); const update={...this.draft,name:this.draft.name.trim(),date}; const error=validateEvent(update);this.error.set(error);if(error)return;this.saving.set(true);this.notice.set('');
    try{const {event}=await firstValueFrom(this.api.saveEvent(this.selectedId,update));this.events.update(events=>events.map(existing=>existing.id===event.id?event:existing));this.draft={...this.draft,date:event.date};this.dateInput=kolkataDateInput(event.date);this.originalDateInput=this.dateInput;this.notice.set('Event saved.');}
    catch(error){this.error.set(error instanceof HttpErrorResponse && typeof error.error?.error === 'string' ? error.error.error : 'Unable to save this event. Please try again.');}finally{this.saving.set(false);}}
}
