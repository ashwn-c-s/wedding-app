import { Event, GuestInvite } from '../../core/models';
export const weddingEvent: Event = { id: 'event-1', slug: 'wedding', name: 'Wedding', date: '2026-11-15T05:30:00Z', time_label: '11 AM', venue_name: 'Wedding Hall', venue_address: 'Ottapalam', maps_url: null, directions_text: null, is_visible: true };
export const guestInvite: GuestInvite = { guest: { id: 'guest-1', name: 'A Guest', party_size: 2 }, events: [weddingEvent] };
