export interface GuestLocation {type:'coordinates'|'maps';latitude?:number;longitude?:number;accuracy_m?:number|null;maps_url?:string;address?:string|null;}
import { Event } from './index';
export interface GuestTag {id:string;name:string;guest_count?:number}
export type AdminRole = 'full' | 'restricted';
export interface AdminGuest { location?:GuestLocation|null; id: string; name: string; phone: string; party_size: number; invite_token: string; event_ids: string[]; tags?:GuestTag[]; responses: {event_id: string; attending: boolean}[]; }
export interface ImportReport { created: number; updated: number; failed: number; results: {row: number; phone?: string; status: 'created' | 'updated' | 'error'; message?: string}[]; }
export interface DashboardData { tags?:GuestTag[]; guests: {id: string; name: string; party_size: number; event_ids: string[]; tags?:GuestTag[]}[]; events: Event[]; responses: {guest_id: string; event_id: string; attending: boolean; submitted_at: string}[]; }
export type EventUpdate = Omit<Event, 'id' | 'slug'>;
export type EventCreate = EventUpdate & {slug:string};
export interface GuestUpdate {location?:GuestLocation|null;name:string;phone:string;party_size:number;event_ids:string[];tag_ids?:string[];new_tags?:string[];}
