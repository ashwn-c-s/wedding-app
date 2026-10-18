import { GuestLocation } from '../models/admin';
export function guestLocationUrl(location: GuestLocation | null | undefined): string {
  if (!location) return '';
  if (location.type === 'coordinates') {
    return Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && Math.abs(location.latitude!) <= 90 && Math.abs(location.longitude!) <= 180
      ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}` : '';
  }
  try {
    const url = new URL(location.maps_url || '');
    const validHost = ['maps.app.goo.gl','maps.google.com'].includes(url.hostname) ||
      (['google.com','www.google.com','goo.gl'].includes(url.hostname) && /^\/maps(?:\/|$)/.test(url.pathname));
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && validHost ? url.href : '';
  } catch { return ''; }
}
