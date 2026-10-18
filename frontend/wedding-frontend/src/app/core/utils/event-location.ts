import { Event } from '../models';

export function directionsUrl(event: Event): string {
  if (event.maps_url) {
    try {
      const url = new URL(event.maps_url);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
    } catch { /* Use the address when a stored URL is malformed. */ }
  }
  const location = [event.venue_name, event.venue_address].filter(Boolean).join(', ');
  return location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : '';
}

