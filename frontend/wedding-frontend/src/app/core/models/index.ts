export interface Event {
  id: string;
  slug: string;
  name: string;
  date: string;
  time_label: string;
  venue_name: string | null;
  venue_address: string | null;
  maps_url: string | null;
  directions_text: string | null;
  is_visible: boolean;
}

export interface Guest {
  id: string;
  name: string;
  party_size: number;
}

export interface GuestInvite {
  guest: Guest;
  events: Event[];
}

export interface RsvpResponse {
  event_id: string;
  attending: boolean;
}

export interface RsvpStatus {
  submitted: boolean;
  responses: RsvpResponse[];
}

export interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
  album_type: 'pre' | 'post';
  created_at: string;
}

export interface AdminUser {
  user_id: string;
  role: 'full' | 'restricted';
}