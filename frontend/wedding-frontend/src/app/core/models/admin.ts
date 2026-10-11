import { Event } from './index';
export type AdminRole = 'full' | 'restricted';
export interface AdminGuest { id: string; name: string; phone: string; party_size: number; invite_token: string; event_ids: string[]; responses: {event_id: string; attending: boolean}[]; }
export interface ImportReport { created: number; updated: number; failed: number; results: {row: number; phone?: string; status: 'created' | 'updated' | 'error'; message?: string}[]; }
export interface DashboardData { guests: {id: string; name: string; party_size: number; event_ids: string[]}[]; events: Event[]; responses: {guest_id: string; event_id: string; attending: boolean; submitted_at: string}[]; }
export type EventUpdate = Omit<Event, 'id' | 'slug'>;
export type EventCreate = EventUpdate & {slug:string};
export interface GuestUpdate {name:string;phone:string;party_size:number;event_ids:string[];}
